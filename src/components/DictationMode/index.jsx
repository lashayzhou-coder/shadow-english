import React, { useState, useCallback, useEffect } from 'react';
import './DictationMode.css';
import { useTranscript } from '../../contexts/TranscriptContext';
import { smartWordDiff, getDiffStats } from '../../utils/diffUtils';

const DictationMode = () => {
  const { sentences, currentSentenceIndex, translations } = useTranscript();

  const [userInput, setUserInput] = useState('');
  const [diffResults, setDiffResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentSentence, setCurrentSentence] = useState('');
  const [showResult, setShowResult] = useState(false);

  // 更新当前句子
  useEffect(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
      setCurrentSentence(sentences[currentSentenceIndex].text);
    }
  }, [sentences, currentSentenceIndex]);

  // 处理提交对照
  const handleSubmit = useCallback(() => {
    if (!currentSentence || !userInput.trim()) return;

    // 将用户输入和原文分词
    const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0);
    const originalWords = currentSentence.split(/\s+/).filter(w => w.length > 0);

    // 执行 diff
    const diff = smartWordDiff(originalWords, userWords);
    const diffStats = getDiffStats(diff);

    setDiffResults(diff);
    setStats(diffStats);
    setShowResult(true);
  }, [currentSentence, userInput]);

  // 处理重置
  const handleReset = useCallback(() => {
    setUserInput('');
    setDiffResults(null);
    setStats(null);
    setShowResult(false);
  }, []);

  // 处理点击单词添加到生词本
  const handleWordClick = useCallback((word, type) => {
    // 清理单词（移除标点）
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    // 获取单词定义
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

  // 渲染 diff 结果单词
  const renderDiffWord = (item, index) => {
    const wordClass = `diff-word diff-${item.type}`;

    let displayText = item.original || item.user;
    if (item.type === 'wrong') {
      // 错误：显示原文（删除线）+ 用户输入（红色）
      return (
        <span key={index} className="diff-pair">
          <span className="diff-original">{item.original}</span>
          <span className="diff-user-wrong">{item.user}</span>
        </span>
      );
    }

    return (
      <span
        key={index}
        className={wordClass}
        onClick={() => item.type === 'correct' && handleWordClick(displayText, 'correct')}
        style={{ cursor: item.type === 'correct' ? 'pointer' : 'default' }}
      >
        {displayText}
      </span>
    );
  };

  return (
    <div className="dictation-container">
      <div className="dictation-header">
        <h2 className="text-xl font-semibold mb-4">📝 听写模式</h2>
        <div className="dictation-info">
          <span>字幕句数: {sentences.length}</span>
          <span>当前句子: {currentSentenceIndex + 1} / {sentences.length}</span>
        </div>
      </div>

      {!showResult ? (
        <div className="dictation-input-section">
          <div className="current-sentence-box">
            <div className="sentence-label">当前句子（播放中）</div>
            <div className="sentence-text-display">
              {currentSentence || '暂无字幕，请先在播放器中添加字幕'}
            </div>
          </div>

          <div className="input-section">
            <label className="input-label">请输入你听到的内容：</label>
            <textarea
              className="dictation-textarea"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="在此输入英文..."
              rows={4}
            />
          </div>

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!currentSentence || !userInput.trim()}
            >
              提交对照
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
            >
              重置
            </button>
          </div>
        </div>
      ) : (
        <div className="dictation-result-section">
          <div className="result-header">
            <h3>对照结果</h3>
            <div className="score-display">
              <span className="score-label">得分</span>
              <span className="score-value">{stats.score}</span>
              <span className="score-percent">%</span>
            </div>
          </div>

          <div className="stats-bar">
            <span className="stat correct">🟢 正确: {stats.correct}</span>
            <span className="stat wrong">🔴 错误: {stats.wrong}</span>
            <span className="stat missing">🟡 缺失: {stats.missing}</span>
            <span className="stat extra">🟠 多余: {stats.extra}</span>
          </div>

          <div className="comparison-box">
            <div className="comparison-row">
              <span className="comparison-label">原文：</span>
              <div className="comparison-content original">
                {diffResults.map((item, index) => (
                  <span key={index} className={`diff-word diff-${item.type}`}>
                    {item.original}
                  </span>
                ))}
              </div>
            </div>

            <div className="comparison-row">
              <span className="comparison-label">你的输入：</span>
              <div className="comparison-content user">
                {diffResults.map((item, index) => {
                  if (item.type === 'missing') {
                    return (
                      <span key={index} className="diff-word diff-missing" title="原文中缺失">
                        _____
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
                    <span
                      key={index}
                      className={`diff-word diff-${item.type}`}
                      onClick={() => item.type === 'correct' && handleWordClick(item.user, item.type)}
                      style={{ cursor: item.type === 'correct' ? 'pointer' : 'default' }}
                    >
                      {item.user}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="legend">
            <span>🟢 绿色 = 正确</span>
            <span>🔴 红色 = 错误（点击可加入生词本）</span>
            <span>🟡 黄色 = 缺失</span>
            <span>🟠 橙色 = 多余</span>
          </div>

          <div className="button-group">
            <button className="btn btn-primary" onClick={handleReset}>
              继续听写
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DictationMode;