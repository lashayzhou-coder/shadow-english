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
  let mediaStream = null;
  let audioChunks = [];  // 存储 Float32Array chunks (原始采样数据)
  let connection = null;
  let actualSampleRate = 48000;  // 默认浏览器采样率

  const start = async (stream) => {
    console.log('[Deepgram] start() 被调用');
    mediaStream = stream;
    audioChunks = [];

    try {
      const apiKey = getDeepgramApiKey();
      console.log('[Deepgram] API Key 长度:', apiKey ? apiKey.length : 0);

      // 创建 Web Audio API - 用于波形分析
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      actualSampleRate = audioContext.sampleRate;
      console.log('[Deepgram] AudioContext sampleRate:', actualSampleRate);

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -80;
      analyser.maxDecibels = -10;

      sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      // 创建 ScriptProcessor 来捕获 PCM 数据
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      scriptProcessor.onaudioprocess = (event) => {
        if (!isRecording) return;

        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);

        // 创建 Float32Array 副本并保存
        const audioData = new Float32Array(channelData.length);
        audioData.set(channelData);
        audioChunks.push(audioData);

        // 转换为 Int16Array PCM 并发送
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = audioData[i];
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 发送音频到 Deepgram
        if (connection && isRecording) {
          try {
            // 创建 PCM 数据的副本再发送
            const sendBuffer = new ArrayBuffer(pcmData.length * 2);
            const sendView = new Int16Array(sendBuffer);
            sendView.set(pcmData);
            connection.sendMedia(sendBuffer);
          } catch (e) {
            console.error('[Deepgram] 发送音频失败:', e);
          }
        }
      };

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

      console.log('[Deepgram] 连接对象已创建');

      // 设置事件处理器
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

      // 调用 connect() 启动连接
      connection.connect();

      // 等待连接打开
      await connection.waitForOpen();
      console.log('[Deepgram] 连接已打开');

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

    console.log('[Deepgram] 生成录音, chunks:', audioChunks.length, '采样率:', actualSampleRate);

    // 计算总采样数
    let totalSamples = 0;
    for (const chunk of audioChunks) {
      totalSamples += chunk.length;
    }
    console.log('[Deepgram] 总采样数:', totalSamples);

    // 创建 WAV 文件
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataByteLength = totalSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataByteLength);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');

    // fmt chunk
    view.setUint32(16, 16, true);  // chunk size
    view.setUint16(20, 1, true);    // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, actualSampleRate, true);
    view.setUint32(28, actualSampleRate * numChannels * bytesPerSample, true);  // byte rate
    view.setUint16(32, numChannels * bytesPerSample, true);  // block align
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataByteLength, true);

    // 写入音频数据
    let offset = 44;
    for (const chunk of audioChunks) {
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    console.log('[Deepgram] WAV 文件大小:', buffer.byteLength, '字节');
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