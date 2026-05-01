import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import './ShadowRecording.css';
import { createDeepgramTranscriber, createMediaRecorder } from '../../services/DeepgramApi';
import { smartWordDiff, getDiffStats } from '../../utils/diffUtils';

// 从 localStorage 读取字幕状态
const loadTranscriptState = () => {
  try {
    const savedState = localStorage.getItem('transcript_state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        sentences: parsed.sentences || [],
        currentSentenceIndex: parsed.currentSentenceIndex || 0,
        timestamps: parsed.timestamps || []
      };
    }
  } catch (error) {
    console.error('读取字幕状态失败:', error);
  }
  return { sentences: [], currentSentenceIndex: 0, timestamps: [] };
};

// 绘制音频波形的函数
const drawWaveform = (analyser, canvasRef) => {
  if (!analyser || !canvasRef.current) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!canvasRef.current) return;
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'rgb(200, 200, 200)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(59, 130, 246)';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  draw();
};

const ShadowRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [analyser, setAnalyser] = useState(null);
  const [transcriptState, setTranscriptState] = useState(loadTranscriptState);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const transcriberRef = useRef(null);

  const { sentences, currentSentenceIndex } = transcriptState;
  const currentSentence = useMemo(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
      return sentences[currentSentenceIndex].text;
    }
    return '';
  }, [sentences, currentSentenceIndex]);

  // 监听字幕状态变化
  useEffect(() => {
    const interval = setInterval(() => {
      setTranscriptState(loadTranscriptState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 开始跟读
  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setTranscripts([]);
      setCurrentTranscript('');
      setEvaluationResult(null);

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建录音机
      const mediaRecorder = createMediaRecorder(stream, {
        onDataAvailable: (data) => {
          // 可以在此处理实时音频数据
        },
        onStop: (blob) => {
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
        },
        onError: (err) => {
          console.error('录音错误:', err);
          setError('录音失败: ' + err.message);
        }
      });

      // 创建 Deepgram 转录器
      transcriberRef.current = createDeepgramTranscriber({
        onTranscript: ({ transcript, is_final }) => {
          if (is_final) {
            setTranscripts(prev => [...prev, transcript]);
            setCurrentTranscript('');
          } else {
            setCurrentTranscript(transcript);
          }
        },
        onError: (err) => {
          console.error('转录错误:', err);
          setError('转录失败');
        }
      });

      // 启动转录
      const { audioContext, analyser: audioAnalyser } = await transcriberRef.current.start(stream);
      setAnalyser(audioAnalyser);

      // 开始录音
      mediaRecorder.start();
      setIsRecording(true);

      // 开始绘制波形
      if (canvasRef.current && audioAnalyser) {
        drawWaveform(audioAnalyser, canvasRef);
      }
    } catch (err) {
      console.error('启动跟读失败:', err);
      setError('无法访问麦克风: ' + err.message);
    }
  }, []);

  // 停止跟读
  const handleStopRecording = useCallback(() => {
    if (transcriberRef.current) {
      transcriberRef.current.stop();
    }
    setIsRecording(false);
    setAnalyser(null);

    // 执行发音评估
    if (currentSentence && transcripts.length > 0) {
      const fullTranscript = transcripts.join(' ');
      const userWords = fullTranscript.trim().split(/\s+/).filter(w => w.length > 0);
      const originalWords = currentSentence.split(/\s+/).filter(w => w.length > 0);

      const diffResults = smartWordDiff(originalWords, userWords);
      const stats = getDiffStats(diffResults);

      setEvaluationResult({
        diffResults,
        stats,
        transcript: fullTranscript
      });
    }
  }, [currentSentence, transcripts]);

  // 播放录音
  const handlePlayRecording = useCallback(() => {
    if (recordedUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [recordedUrl]);

  // 停止播放
  const handleStopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // 录音播放结束
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className="shadow-recording-container">
      <div className="shadow-header">
        <h2 className="text-xl font-semibold mb-2">🎙️ 跟读模式</h2>
        <div className="shadow-info">
          <span>字幕句数: {sentences.length}</span>
          {currentSentence && (
            <span>当前: {currentSentenceIndex + 1} / {sentences.length}</span>
          )}
        </div>
      </div>

      {/* 当前句子显示 */}
      {currentSentence && (
        <div className="current-sentence-box">
          <div className="sentence-label">📍 当前句子</div>
          <div className="sentence-text-display">
            {currentSentence}
          </div>
        </div>
      )}

      {/* 波形画布 */}
      <div className="waveform-container">
        <canvas ref={canvasRef} className="waveform-canvas" width={600} height={100} />
        {!isRecording && (
          <div className="waveform-placeholder">
            {isRecording ? '录音中...' : '准备就绪'}
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="recording-controls">
        {!isRecording ? (
          <button
            className="btn btn-primary btn-large"
            onClick={handleStartRecording}
            disabled={!currentSentence}
          >
            🎤 开始跟读
          </button>
        ) : (
          <button
            className="btn btn-danger btn-large"
            onClick={handleStopRecording}
          >
            ⏹️ 停止跟读
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 实时转录显示 */}
      {(currentTranscript || transcripts.length > 0) && (
        <div className="transcript-section">
          <h3>转录结果</h3>
          <div className="transcript-text">
            {transcripts.map((t, i) => (
              <span key={i}>{t} </span>
            ))}
            {currentTranscript && (
              <span className="interim">{currentTranscript}</span>
            )}
          </div>
        </div>
      )}

      {/* 录音回放 */}
      {recordedUrl && (
        <div className="recording-playback">
          <h3>🎧 我的录音</h3>
          <div className="audio-player-custom">
            <audio
              ref={audioRef}
              src={recordedUrl}
              onEnded={handleAudioEnded}
            />
            {!isPlaying ? (
              <button className="btn btn-secondary" onClick={handlePlayRecording}>
                ▶️ 播放录音
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleStopPlaying}>
                ⏸️ 停止
              </button>
            )}
          </div>
        </div>
      )}

      {/* 发音评估结果 */}
      {evaluationResult && (
        <div className="evaluation-section">
          <div className="result-header">
            <h3>📊 发音评估</h3>
            <div className="score-display">
              <span className="score-label">得分</span>
              <span className="score-value">{evaluationResult.stats.score}</span>
              <span className="score-percent">%</span>
            </div>
          </div>

          <div className="stats-bar">
            <span className="stat correct">🟢 正确: {evaluationResult.stats.correct}</span>
            <span className="stat wrong">🔴 错误: {evaluationResult.stats.wrong}</span>
            <span className="stat missing">🟡 缺失: {evaluationResult.stats.missing}</span>
            <span className="stat extra">🟠 多余: {evaluationResult.stats.extra}</span>
          </div>

          <div className="comparison-box">
            <div className="comparison-row">
              <span className="comparison-label">原文：</span>
              <div className="comparison-content original">
                {evaluationResult.diffResults.map((item, index) => (
                  <span key={index} className={`diff-word diff-${item.type}`}>
                    {item.original || item.user}
                  </span>
                ))}
              </div>
            </div>
            <div className="comparison-row">
              <span className="comparison-label">你说：</span>
              <div className="comparison-content user">
                {evaluationResult.diffResults.map((item, index) => (
                  <span key={index} className={`diff-word diff-${item.type}`}>
                    {item.user || item.original}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="legend">
            <span>🟢 绿色 = 正确</span>
            <span>🔴 红色 = 错误</span>
            <span>🟡 黄色 = 缺失</span>
            <span>🟠 橙色 = 多余</span>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {!currentSentence && (
        <div className="shadow-hint">
          <p>请先在播放器页面加载媒体文件并上传字幕</p>
        </div>
      )}
    </div>
  );
};

export default ShadowRecording;