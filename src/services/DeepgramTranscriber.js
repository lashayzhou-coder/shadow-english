// Deepgram API 服务 - 使用 Deepgram SDK 进行实时语音转文字
import { DeepgramClient } from '@deepgram/sdk';
import { getDeepgramApiKey } from './DeepgramApi';

// 创建实时语音转录器
export const createDeepgramTranscriber = (options = {}) => {
  const {
    onTranscript = () => {},
    onError = () => {},
    onSpeechStart = () => {},
    onSpeechEnd = () => {},
    interim = false
  } = options;

  let isRecording = false;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let processorNode = null;
  let mediaStream = null;
  let audioChunks = [];
  let connection = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  const start = async (stream) => {
    console.log('[Deepgram] start() 被调用');
    console.log('[Deepgram] stream:', stream ? '存在' : '不存在');
    mediaStream = stream;
    audioChunks = [];

    try {
      const apiKey = getDeepgramApiKey();
      console.log('[Deepgram] API Key 长度:', apiKey ? apiKey.length : 0);

      // 创建 Web Audio API
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -80;
      analyser.maxDecibels = -10;

      sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      // 静音但保持音频图连接
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 创建 ScriptProcessor 用于采集 PCM 数据
      const bufferSize = 4096;
      processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processorNode.onaudioprocess = (event) => {
        if (!isRecording) return;

        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);

        // 转换为 Int16Array PCM
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 保存用于录音回放
        audioChunks.push(new Int16Array(pcmData));

        // 发送音频到 Deepgram
        if (connection && isRecording) {
          try {
            const arrayBuffer = pcmData.buffer.slice(
              pcmData.byteOffset,
              pcmData.byteOffset + pcmData.byteLength
            );
            connection.sendMedia(arrayBuffer);
            console.log('[Deepgram] 已发送音频数据, 大小:', pcmData.length * 2, '字节');
          } catch (e) {
            console.error('[Deepgram] 发送音频失败:', e);
          }
        }
      };

      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      // 创建 Deepgram 连接（使用 SDK）
      console.log('[Deepgram] 创建 Deepgram 连接...');
      const deepgram = new DeepgramClient({ apiKey });

      connection = await deepgram.listen.v1.connect({
        punctuate: true,
        interim_results: interim,
        profanity_filter: false,
        smart_format: true,
        model: 'nova-2',
        sample_rate: 16000,
        channels: 1,
        encoding: 'linear16'
      });

      console.log('[Deepgram] 连接对象已创建, readyState:', connection.readyState);

      // 调用 connect() 启动连接
      connection.connect();
      console.log('[Deepgram] connect() 已调用');

      // 设置事件处理器（在连接打开后）
      connection.on('transcript', (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const is_final = data.is_final;

        if (transcript && transcript.trim()) {
          console.log('[Deepgram] 转录:', transcript, 'is_final:', is_final);
          onTranscript({
            transcript,
            is_final,
            confidence: data.channel?.alternatives?.[0]?.confidence || 1
          });
        }
      });

      connection.on('close', () => {
        console.log('[Deepgram] 连接已关闭');
        isRecording = false;
        onSpeechEnd();
      });

      connection.on('error', (error) => {
        console.error('[Deepgram] 连接错误:', error);
        onError(error);
        isRecording = false;
      });

      // 等待连接打开
      if (connection.readyState !== 'OPEN') {
        console.log('[Deepgram] 等待连接完成...');
        await connection.waitForOpen();
        console.log('[Deepgram] 连接已打开');
      } else {
        console.log('[Deepgram] 连接已打开（同步）');
      }

      // 开始录音
      isRecording = true;
      onSpeechStart();

      return { audioContext, analyser };
    } catch (error) {
      console.error('[Deepgram] 启动失败:', error);
      cleanup();
      onError(error);
      throw error;
    }
  };

  const cleanup = () => {
    isRecording = false;

    if (processorNode) {
      try { processorNode.disconnect(); } catch (e) {}
      processorNode = null;
    }

    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (e) {}
      sourceNode = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close(); } catch (e) {}
    }
    audioContext = null;

    if (connection) {
      try { connection.close(); } catch (e) {}
      connection = null;
    }
  };

  const stop = () => {
    console.log('[Deepgram] 停止录音');
    cleanup();

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    return null;
  };

  const getRecordedAudioBlob = () => {
    if (audioChunks.length === 0) return null;

    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedData = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    return createWavBlob(mergedData, 16000);
  };

  const createWavBlob = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  return {
    start,
    stop,
    getRecordedAudioBlob,
    getIsRecording: () => isRecording,
    getAnalyser: () => analyser
  };
};