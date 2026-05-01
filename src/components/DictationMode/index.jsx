import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './DictationMode.css';
import { useTranscript } from '../../contexts/TranscriptContext';
import { smartWordDiff, getDiffStats } from '../../utils/diffUtils';

const DictationMode = () => {
  const { sentences, currentSentenceIndex, translations } = useTranscript();

  const [userInput, setUserInput] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  // 当前句子
  const currentSentence = useMemo(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
      return sentences[currentSentenceIndex].text;
    }
    return '';
  }, [sentences, currentSentenceIndex]);

  // 分词后的原文
  const originalWords = useMemo(() => {
    return currentSentence.split(/\s+/).filter(w => w.length > 0);
  }, [currentSentence]);

  // 用户输入分词
  const userWords = useMemo(() => {
    return userInput.trim().split(/\s+/).filter(w => w.length > 0);
  }, [userInput]);

  // 实时 diff 结果
  const diffResults = useMemo(() => {
    if (!currentSentence || userInput.trim() === '') return [];
    return smartWordDiff(originalWords, userWords);
  }, [originalWords, userWords]);

  // 实时得分统计
  const stats = useMemo(() => {
    if (diffResults.length === 0) return null;
    return getDiffStats(diffResults);
  }, [diffResults]);

  // 处理点击单词添加到生词本
  const handleWordClick = useCallback((word, type) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    const vocab = JSON.parse(localStorage.getItem('vocabulary') || '[]');
    if (vocab.find(item => item.word === cleanWord)) {
      alert(`"${cleanWord}" 已在生词本中`);
      return;
    }

    const confirmAdd = window.confirm(`将 "${cleanWord}" 加入生词本？`);
    if (confirmAdd) {
      vocab.push({
        word: cleanWord,
        definition: '',
        timestamp: Date.now()
      });
      localStorage.setItem('vocabulary', JSON.stringify(vocab));
      alert(`"${cleanWord}" 已加入生词本`);
    }
  }, []);

  // 处理重置
  const handleReset = useCallback(() => {
    setUserInput('');
    setShowDetail(false);
  }, []);

  return (
    <div className="dictation-container">
      <div className="dictation-header">
        <h2 className="text-xl font-semibold mb-2">📝 听写模式</h2>
        <div className="dictation-info">
          <span>字幕句数: {sentences.length}</span>
          <span>当前句子: {currentSentenceIndex + 1} / {sentences.length}</span>
          {stats && (
            <span className="live-score">
              实时得分: {stats.score}%
            </span>
          )}
        </div>
      </div>

      {/* 当前播放的句子 */}
      <div className="current-sentence-box">
        <div className="sentence-label">
          <span>📍 当前句子</span>
          <span className="sentence-time">
            {currentSentence ? '播放中...' : '等待字幕'}
          </span>
        </div>
        <div className="sentence-text-display">
          {currentSentence || '暂无字幕，请先在播放器页面添加字幕'}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="input-section">
        <label className="input-label">请输入你听到的内容：</label>
        <textarea
          className="dictation-textarea"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="在此输入英文，实时对比结果..."
          rows={3}
        />
      </div>

      {/* 实时比对结果 */}
      {userInput.trim() && (
        <div className="live-comparison">
          {/* 得分统计 */}
          {stats && (
            <div className="score-summary">
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${stats.score}%` }}
                />
              </div>
              <div className="score-details">
                <span className="stat correct">🟢 {stats.correct}</span>
                <span className="stat wrong">🔴 {stats.wrong}</span>
                <span className="stat missing">🟡 {stats.missing}</span>
                <span className="stat extra">🟠 {stats.extra}</span>
              </div>
            </div>
          )}

          {/* 对比展示 */}
          <div className="comparison-box">
            <div className="comparison-row">
              <span className="comparison-label">原文：</span>
              <div className="comparison-content original">
                {diffResults.map((item, index) => {
                  if (item.type === 'extra') return null;
                  return (
                    <span
                      key={index}
                      className={`diff-word diff-${item.type}`}
                    >
                      {item.original || item.user}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="comparison-row">
              <span className="comparison-label">你的输入：</span>
              <div className="comparison-content user">
                {diffResults.map((item, index) => {
                  if (item.type === 'missing') {
                    return (
                      <span key={index} className="diff-word diff-missing" title="原文中缺失">
                        ☐
                      </span>
                    );
                  }
                  return (
                    <span
                      key={index}
                      className={`diff-word diff-${item.type}`}
                      onClick={() => item.type === 'correct' && handleWordClick(item.user, item.type)}
                      style={{ cursor: item.type === 'correct' ? 'pointer' : 'default' }}
                      title={item.type === 'correct' ? '点击加入生词本' : ''}
                    >
                      {item.user}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="legend">
            <span>🟢 绿色 = 正确（点击加入生词本）</span>
            <span>🔴 红色 = 错误</span>
            <span>🟡 黄色 = 缺失</span>
            <span>🟠 橙色 = 多余</span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="button-group">
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={!userInput.trim()}
        >
          清空
        </button>
      </div>

      {/* 提示信息 */}
      {!currentSentence && (
        <div className="dictation-hint">
          <p>请先在「播放器」页面加载媒体文件并上传字幕</p>
        </div>
      )}
    </div>
  );
};

export default DictationMode;