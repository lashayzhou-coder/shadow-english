// Deepgram API 服务 - 用于语音转文字
const DEEPGRAM_API_URL = 'wss://api.deepgram.com/v1/listen';

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
 * 使用 Deepgram 进行实时语音转文字
 * @param {MediaStream} stream - 媒体流
 * @param {Function} onTranscript - 转录结果回调
 * @param {Function} onError - 错误回调
 * @returns {Object} - 返回 { stop, isRecording }
 */
export const createDeepgramTranscriber = (options = {}) => {
  const {
    onTranscript = () => {},
    onError = () => {},
    onSpeechStart = () => {},
    onSpeechEnd = () => {},
    interim = false
  } = options;

  let socket = null;
  let isRecording = false;
  let audioContext = null;
  let analyser = null;
  let mediaRecorder = null;
  let stream = null;

  const start = async (mediaStream) => {
    stream = mediaStream;

    try {
      // 创建 Web Audio API 用于波形可视化
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // 创建 MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

      // 打开 Deepgram WebSocket
      const apiKey = getDeepgramApiKey();
      const url = `${DEEPGRAM_API_URL}?punctuate=true&interim=${interim}&profanity_filter=false&key=${apiKey}`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('Deepgram WebSocket 已连接');
        isRecording = true;

        // 当 MediaRecorder 有数据时发送到 Deepgram
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        // 开始录音
        mediaRecorder.start(250); // 每 250ms 发送一次数据
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 处理转录结果
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript;
            const is_final = data.is_final;

            onTranscript({
              transcript,
              is_final,
              confidence: data.channel?.alternatives?.[0]?.confidence || 1
            });
          }

          // 检测语音开始/结束
          if (data.speech_final) {
            onSpeechEnd();
          }
        } catch (error) {
          console.error('解析 Deepgram 响应失败:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('Deepgram WebSocket 错误:', error);
        onError(error);
      };

      socket.onclose = () => {
        console.log('Deepgram WebSocket 已关闭');
        isRecording = false;
      };

      return { audioContext, analyser };
    } catch (error) {
      console.error('启动录音失败:', error);
      onError(error);
      throw error;
    }
  };

  const stop = () => {
    isRecording = false;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
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