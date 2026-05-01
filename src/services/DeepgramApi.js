// Deepgram API 服务 - 用于语音转文字
import { DeepgramClient } from '@deepgram/sdk';

// Deepgram API Key
const DEEPGRAM_API_KEY = 'bc18dd62cf5ddf66b4cf91a3514d628001847f27';

/**
 * 获取 Deepgram API Key
 */
export const getDeepgramApiKey = () => {
  return localStorage.getItem('deepgram_api_key') || DEEPGRAM_API_KEY;
};

/**
 * 设置 Deepgram API Key
 */
export const setDeepgramApiKey = (key) => {
  localStorage.setItem('deepgram_api_key', key);
};

/**
 * 创建实时语音转录器
 */
export const createDeepgramTranscriber = (options = {}) => {
  const {
    onTranscript = () => {},
    onError = () => {},
    onSpeechStart = () => {},
    onSpeechEnd = () => {},
    interim = false
  } = options;

  let connection = null;
  let isRecording = false;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let processorNode = null;
  let stream = null;
  let audioChunks = [];

  const start = async (mediaStream) => {
    stream = mediaStream;

    try {
      const apiKey = getDeepgramApiKey();
      console.log('[Deepgram] 初始化，API Key 长度:', apiKey ? apiKey.length : 0);

      // 创建 Deepgram 客户端
      const deepgram = new DeepgramClient({ apiKey });

      // 创建 Web Audio API 用于波形可视化
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      sourceNode.connect(analyser);

      // 连接到目标节点（用于波形可视化，实际不放音）
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // 静音但保持连接
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 创建音频处理器以获取原始 PCM 数据
      const bufferSize = 4096;
      processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0); // Float32Array

        // 转换为 Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 保存用于录音回放
        audioChunks.push(new Int16Array(pcmData));

        // 发送给 Deepgram
        if (connection && isRecording) {
          try {
            // Deepgram SDK 期望 ArrayBuffer 或类似的二进制数据
            const arrayBuffer = pcmData.buffer.slice(pcmData.byteOffset, pcmData.byteOffset + pcmData.byteLength);
            connection.sendMedia(arrayBuffer);
          } catch (e) {
            console.error('[Deepgram] 发送音频失败:', e);
          }
        }
      };

      // 提前连接音频节点，确保音频能正常流入处理器
      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      // 注意：不要在这里提前连接 processorNode，等连接打开后再连接

      // 创建 Deepgram 连接
      connection = await deepgram.listen.v1.connect({
        punctuate: true,
        interim_results: interim,
        profanity_filter: false,
        smart_format: true,
        model: 'nova-2',
        sample_rate: 16000,
        channels: 1,
        encoding: 'linear16'
      }).catch(err => {
        console.error('[Deepgram] 连接创建失败:', err);
        throw err;
      });

      console.log('[Deepgram] 连接对象已创建, readyState:', connection.readyState);

      // 等待连接真正打开后再开始录音
      try {
        await connection.waitForOpen();
        console.log('[Deepgram] 连接已打开');
      } catch (err) {
        console.error('[Deepgram] 等待连接打开失败:', err);
        throw err;
      }

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

      // 开始录音状态
      isRecording = true;
      audioChunks = [];
      onSpeechStart();

      return { audioContext, analyser };
    } catch (error) {
      console.error('[Deepgram] 启动失败:', error);
      onError(error);
      throw error;
    }
  };

  // 获取累积的音频数据用于回放
  const getRecordedAudioBlob = () => {
    if (audioChunks.length === 0) return null;

    // 合并所有 Int16Array
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedData = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    // 创建 WAV 文件
    const wavBlob = createWavBlob(mergedData, 16000);
    return wavBlob;
  };

  // 创建 WAV Blob
  const createWavBlob = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV Header
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 写入 PCM 数据
    const dataOffset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(dataOffset + i * 2, pcmData[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const stop = () => {
    isRecording = false;

    if (processorNode) {
      processorNode.disconnect();
      processorNode = null;
    }

    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }

    if (connection) {
      try {
        connection.close();
      } catch (e) {
        console.error('[Deepgram] 关闭连接失败:', e);
      }
      connection = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    return null;
  };

  return {
    start,
    stop,
    getRecordedAudioBlob,
    getIsRecording: () => isRecording,
    getAnalyser: () => analyser
  };
};

export default {
  getDeepgramApiKey,
  setDeepgramApiKey,
  createDeepgramTranscriber
};