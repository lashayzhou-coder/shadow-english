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
 * 使用 Deepgram SDK 进行实时语音转文字
 * @param {MediaStream} stream - 媒体流
 * @param {Object} options - 配置选项
 * @returns {Object} - 返回 { stop, isRecording, analyser, sendAudio }
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
  let stream = null;

  const start = async (mediaStream) => {
    stream = mediaStream;

    try {
      const apiKey = getDeepgramApiKey();
      console.log('初始化 Deepgram，API Key 长度:', apiKey ? apiKey.length : 0);
      const deepgram = new DeepgramClient({ apiKey });

      // 创建 Web Audio API 用于波形可视化
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // 创建 Deepgram 实时连接
      const listenClient = deepgram.listen;

      // 使用 v1 的 connect 方法
      connection = await listenClient.v1.connect({
        punctuate: true,
        interim_results: interim,
        profanity_filter: false,
        smart_format: true,
        model: 'nova-2'
      });

      // 设置事件处理器
      connection.on('open', () => {
        console.log('Deepgram 连接已打开');
        isRecording = true;
        onSpeechStart();
      });

      connection.on('transcript', (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const is_final = data.is_final;

        if (transcript) {
          onTranscript({
            transcript,
            is_final,
            confidence: data.channel?.alternatives?.[0]?.confidence || 1
          });
        }
      });

      connection.on('close', () => {
        console.log('Deepgram 连接已关闭');
        isRecording = false;
        onSpeechEnd();
      });

      connection.on('error', (error) => {
        console.error('Deepgram 连接错误:', error);
        onError(error);
        isRecording = false;
      });

      return { audioContext, analyser };
    } catch (error) {
      console.error('启动录音失败:', error);
      onError(error);
      throw error;
    }
  };

  // 发送音频数据
  const sendAudio = (audioData) => {
    if (connection && connection.readyState === 1 && audioData) {
      try {
        connection.sendMedia(audioData);
      } catch (e) {
        console.error('发送音频数据失败:', e);
      }
    }
  };

  const stop = () => {
    isRecording = false;

    if (connection) {
      try {
        connection.close();
      } catch (e) {
        console.error('关闭连接失败:', e);
      }
      connection = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    return null;
  };

  return {
    start,
    stop,
    sendAudio,
    getIsRecording: () => isRecording,
    getAnalyser: () => analyser
  };
};

/**
 * 简单的录音功能（不使用 Deepgram）
 */
export const createMediaRecorder = (stream, options = {}) => {
  const { onDataAvailable = () => {}, onStop = () => {}, onError = () => {} } = options;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : 'audio/mp4';

  const recorder = new MediaRecorder(stream, { mimeType });
  const audioChunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
      onDataAvailable(event.data);
    }
  };

  recorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    onStop(audioBlob);
  };

  recorder.onerror = (event) => {
    console.error('MediaRecorder 错误:', event);
    onError(event);
  };

  return {
    recorder,
    start: () => recorder.start(),
    stop: () => recorder.stop(),
    getState: () => recorder.state,
    getAudioChunks: () => audioChunks
  };
};

export default {
  getDeepgramApiKey,
  setDeepgramApiKey,
  createDeepgramTranscriber,
  createMediaRecorder
};