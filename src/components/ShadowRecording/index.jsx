import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import './ShadowRecording.css';
import { createDeepgramTranscriber } from '../../services/DeepgramTranscriber';
import { smartWordDiff, getDiffStats } from '../../utils/diffUtils';
import { comparePronunciation } from '../../utils/audioCompare';
import { useAudioAnalysis } from '../../contexts/AudioAnalysisContext';

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
  const audioChunksRef = useRef([]);  // 存储录音的音频数据

  // 使用音频分析上下文
  const { extractAudioData, getCurrentTime } = useAudioAnalysis() || {
    extractAudioData: async () => null,
    getCurrentTime: () => 0
  };

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
    console.log('[Shadow] handleStartRecording 被调用');
    try {
      setError(null);
      setRecordedUrl(null);
      setTranscripts([]);
      setCurrentTranscript('');
      setEvaluationResult(null);

      console.log('[Shadow] 正在请求麦克风权限...');
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Shadow] 麦克风权限已获取');

      // 创建 Deepgram 转录器
      console.log('[Shadow] 创建 Deepgram 转录器...');
      transcriberRef.current = createDeepgramTranscriber({
        onTranscript: ({ transcript, is_final }) => {
          console.log('[Shadow] 转录结果:', transcript, 'is_final:', is_final);
          if (is_final && transcript) {
            setTranscripts(prev => {
              console.log('[Shadow] 累积转录:', [...prev, transcript]);
              return [...prev, transcript];
            });
            setCurrentTranscript('');
          } else if (transcript) {
            setCurrentTranscript(transcript);
          }
        },
        onError: (err) => {
          console.error('[Shadow] 转录错误:', err);
          setError('转录失败: ' + err.message);
        },
        onSpeechStart: () => {
          console.log('[Shadow] 语音开始');
        },
        onSpeechEnd: () => {
          console.log('[Shadow] 语音结束');
        }
      });

      // 启动转录
      console.log('[Shadow] 启动转录...');
      const result = await transcriberRef.current.start(stream);
      audioChunksRef.current = result.getAudioChunks();
      setAnalyser(result.analyser);

      setIsRecording(true);
      console.log('[Shadow] isRecording 已设置为 true');

      // 开始绘制波形
      if (canvasRef.current && result.analyser) {
        drawWaveform(result.analyser, canvasRef);
      }
    } catch (err) {
      console.error('[Shadow] 启动跟读失败:', err);
      const errorMessage = err && err.message ? err.message : (err && err.toString ? err.toString() : '未知错误');
      setError('无法访问麦克风: ' + errorMessage);
    }
  }, []);

  // 停止跟读
  const handleStopRecording = useCallback(async () => {
    console.log('[Shadow] 停止跟读');

    if (transcriberRef.current) {
      transcriberRef.current.stop();
    }
    setIsRecording(false);
    setAnalyser(null);

    // 获取录音数据
    if (transcriberRef.current && audioChunksRef.current) {
      const blob = transcriberRef.current.createRecordedBlob(
        audioChunksRef.current,
        transcriberRef.current.getSampleRate()
      );
      if (blob) {
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        console.log('[Shadow] 录音已保存');
      }
    }

    // 获取录音的音频数据
    let recordedAudioData = null;
    if (transcriberRef.current && audioChunksRef.current && audioChunksRef.current.length > 0) {
      // 将 audioChunks 合并为单个 Float32Array
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      recordedAudioData = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunksRef.current) {
        recordedAudioData.set(chunk, offset);
        offset += chunk.length;
      }
    }

    // 获取当前播放位置的原文音频数据
    const currentTime = getCurrentTime();
    console.log('[Shadow] 当前播放时间:', currentTime);

    let originalAudioData = null;
    if (currentTime > 0 && extractAudioData) {
      // 提取当前句子对应时间范围的音频（取当前时间前后1秒）
      const audioDuration = 2; // 抓取2秒的音频片段
      originalAudioData = await extractAudioData(Math.max(0, currentTime - 0.5), audioDuration);
      console.log('[Shadow] 原文音频数据:', originalAudioData ? `长度=${originalAudioData.length}` : '无');
    }

    // 进行音频对比评估
    let audioScore = 0;
    let audioFeedback = [];
    if (originalAudioData && recordedAudioData) {
      console.log('[Shadow] 开始音频对比');
      const analysisResult = comparePronunciation(originalAudioData, recordedAudioData, 48000);
      audioScore = analysisResult.overallScore;
      audioFeedback = analysisResult.feedback;
      console.log('[Shadow] 音频评估结果:', analysisResult);
    } else {
      console.log('[Shadow] 无法获取原文音频，跳过音频对比');
    }

    // 保留语音转文字的对比结果作为辅助参考
    const finalTranscript = transcripts.join(' ').trim();
    console.log('[Shadow] 评估 - 原文:', currentSentence);
    console.log('[Shadow] 评估 - 转录:', finalTranscript);

    if (currentSentence) {
      const originalWords = currentSentence.split(/\s+/).filter(w => w.length > 0);

      if (finalTranscript) {
        const userWords = finalTranscript.split(/\s+/).filter(w => w.length > 0);
        const diffResults = smartWordDiff(originalWords, userWords);
        const textStats = getDiffStats(diffResults);

        // 合并音频评估和文字评估的结果
        // 音频评估权重更高（60%），文字评估作为辅助（40%）
        const combinedScore = audioScore > 0
          ? Math.round(audioScore * 0.6 + textStats.score * 0.4)
          : textStats.score;

        console.log('[Shadow] 综合评估结果:', combinedScore);

        setEvaluationResult({
          diffResults,
          stats: {
            ...textStats,
            score: combinedScore,
            audioScore,
            audioFeedback
          },
          transcript: finalTranscript,
          originalText: currentSentence
        });
      } else {
        // 无转录结果，只使用音频评估
        setEvaluationResult({
          diffResults: originalWords.map(word => ({ type: 'missing', original: word })),
          stats: {
            correct: 0,
            wrong: 0,
            missing: originalWords.length,
            extra: 0,
            total: originalWords.length,
            score: audioScore,
            audioScore,
            audioFeedback
          },
          transcript: '',
          originalText: currentSentence
        });
      }
    }
  }, [currentSentence, transcripts, extractAudioData, getCurrentTime]);

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

  // 渲染对比结果
  const renderComparison = (results, type) => {
    return results.map((item, index) => {
      if (type === 'original') {
        if (item.type === 'extra') return null;
        return (
          <span key={index} className={`diff-word diff-${item.type}`}>
            {item.original}
          </span>
        );
      } else {
        if (item.type === 'missing') {
          return (
            <span key={index} className="diff-word diff-missing" title="原文中缺失">
              ☐
            </span>
          );
        }
        if (item.type === 'extra') {
          return (
            <span key={index} className="diff-word diff-extra">
              {item.user}
            </span>
          );
        }
        return (
          <span key={index} className={`diff-word diff-${item.type}`}>
            {item.user}
          </span>
        );
      }
    });
  };

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
          <div className="sentence-label">📍 当前句子（原文）</div>
          <div className="sentence-text-display">
            {currentSentence}
          </div>
        </div>
      )}

      {/* 波形画布 */}
      <div className="waveform-container">
        <canvas ref={canvasRef} className="waveform-canvas" width={600} height={100} />
        {isRecording && (
          <div className="waveform-status recording">
            🔴 录音中...
          </div>
        )}
        {!isRecording && (
          <div className="waveform-placeholder">
            准备就绪
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
            ⏹️ 停止并评估
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
          <h3>🔤 识别内容</h3>
          <div className="transcript-text">
            {transcripts.map((t, i) => (
              <span key={i} className="final-transcript">{t} </span>
            ))}
            {currentTranscript && (
              <span className="interim">{currentTranscript}</span>
            )}
          </div>
          {!currentTranscript && transcripts.length === 0 && (
            <p className="text-gray-500 text-sm mt-2">正在识别语音...</p>
          )}
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
            <h3>📊 发音评估结果</h3>
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
              <span className="comparison-label">👆 原文：</span>
              <div className="comparison-content original">
                {renderComparison(evaluationResult.diffResults, 'original')}
              </div>
            </div>
            <div className="comparison-row">
              <span className="comparison-label">🎤 跟读：</span>
              <div className="comparison-content user">
                {renderComparison(evaluationResult.diffResults, 'user')}
              </div>
            </div>
          </div>

          <div className="legend">
            <span>🟢 绿色 = 正确</span>
            <span>🔴 红色 = 错误</span>
            <span>🟡 黄色 = 缺失（原文中没有）</span>
            <span>🟠 橙色 = 多余（原文没有）</span>
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