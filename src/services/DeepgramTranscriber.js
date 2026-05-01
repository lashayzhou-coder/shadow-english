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
  let scriptProcessor = null;
  let mediaStream = null;
  let connection = null;
  let actualSampleRate = 48000;

  // 存储每个 chunk 的元数据，用于调试
  const chunkInfo = [];

  const start = async (stream) => {
    console.log('[Deepgram] start() 被调用');
    mediaStream = stream;
    chunkInfo.length = 0;

    try {
      const apiKey = getDeepgramApiKey();
      console.log('[Deepgram] API Key 长度:', apiKey ? apiKey.length : 0);

      // 创建 Web Audio API
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      actualSampleRate = audioContext.sampleRate;
      console.log('[Deepgram] AudioContext sampleRate:', actualSampleRate);

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -80;
      analyser.maxDecibels = -10;

      sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      // 创建 ScriptProcessor
      const bufferSize = 4096;
      scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      // 存储所有音频数据（作为 Float32 数组的副本）
      const audioChunks = [];

      scriptProcessor.onaudioprocess = (event) => {
        if (!isRecording) return;

        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);

        // 计算这一帧的统计信息用于调试
        let min = Infinity, max = -Infinity, sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          const v = channelData[i];
          if (v < min) min = v;
          if (v > max) max = v;
          sum += v;
        }
        const avg = sum / channelData.length;

        // 创建副本并保存
        const audioCopy = new Float32Array(channelData);
        audioChunks.push(audioCopy);

        // 记录 chunk 信息
        chunkInfo.push({
          index: chunkInfo.length,
          min, max, avg,
          length: channelData.length
        });

        console.log(`[Deepgram] Chunk ${chunkInfo.length}: min=${min.toFixed(4)}, max=${max.toFixed(4)}, avg=${avg.toFixed(4)}`);

        // 转换为 Int16Array PCM
        const pcmData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          // 不再 clamp，直接转换
          const s = channelData[i];
          pcmData[i] = s < 0 ? s * 32768 : s * 32767;
        }

        // 发送音频到 Deepgram
        if (connection && isRecording) {
          try {
            // 每次发送都创建新的 ArrayBuffer 副本
            const sendBuffer = new ArrayBuffer(pcmData.byteLength);
            new Uint8Array(sendBuffer).set(new Uint8Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength));
            connection.sendMedia(sendBuffer);
          } catch (e) {
            console.error('[Deepgram] 发送音频失败:', e);
          }
        }
      };

      // 创建 Deepgram 连接
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

      connection.connect();
      await connection.waitForOpen();
      console.log('[Deepgram] 连接已打开');

      isRecording = true;
      onSpeechStart();

      // 返回访问函数和清理函数
      return {
        audioContext,
        analyser,
        getAudioChunks: () => audioChunks,
        getChunkInfo: () => [...chunkInfo]
      };
    } catch (error) {
      console.error('[Deepgram] 启动失败:', error);
      cleanup();
      onError(error);
      throw error;
    }
  };

  const cleanup = () => {
    isRecording = false;

    if (scriptProcessor) {
      try { scriptProcessor.disconnect(); } catch (e) {}
      scriptProcessor = null;
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

    chunkInfo.length = 0;
  };

  const stop = () => {
    console.log('[Deepgram] 停止录音, chunkInfo:', chunkInfo.length, 'chunks');
    cleanup();

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    return null;
  };

  // 导出 getRecordedAudioBlob 给外部调用
  // 注意：需要传入 audioChunks 和 sampleRate
  const createRecordedBlob = (audioChunks, sampleRate) => {
    if (audioChunks.length === 0) return null;

    console.log('[Deepgram] 生成录音, chunks:', audioChunks.length, '采样率:', sampleRate);

    let totalSamples = 0;
    for (const chunk of audioChunks) {
      totalSamples += chunk.length;
    }
    console.log('[Deepgram] 总采样数:', totalSamples);

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
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataByteLength, true);

    // 写入音频数据
    let offset = 44;
    for (const chunk of audioChunks) {
      for (let i = 0; i < chunk.length; i++) {
        // 直接转换，不 clamp
        const s = chunk[i];
        const int16 = s < 0 ? s * 32768 : s * 32767;
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
    createRecordedBlob,
    getIsRecording: () => isRecording,
    getAnalyser: () => analyser,
    getSampleRate: () => actualSampleRate
  };
};