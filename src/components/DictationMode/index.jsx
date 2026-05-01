import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './DictationMode.css';
import { useTranscript } from '../../contexts/TranscriptContext';
import { smartWordDiff, getDiffStats } from '../../utils/diffUtils';

const DictationMode = () => {
  const { sentences, currentSentenceIndex } = useTranscript();

  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // 当前句子（只在提交后显示）
  const currentSentence = useMemo(() => {
    if (hasSubmitted && sentences.length > 0 && currentSentenceIndex < sentences.length) {
      return sentences[currentSentenceIndex].text;
    }
    return '';
  }, [hasSubmitted, sentences, currentSentenceIndex]);

  // 分词后的原文
  const originalWords = useMemo(() => {
    return currentSentence.split(/\s+/).filter(w => w.length > 0);
  }, [currentSentence]);

  // 用户输入分词
  const userWords = useMemo(() => {
    return userInput.trim().split(/\s+/).filter(w => w.length > 0);
  }, [userInput]);

  // Diff 结果（只在提交后计算）
  const diffResults = useMemo(() => {
    if (!hasSubmitted || !currentSentence || userInput.trim() === '') return [];
    return smartWordDiff(originalWords, userWords);
  }, [hasSubmitted, originalWords, userWords]);

  // 得分统计
  const stats = useMemo(() => {
    if (diffResults.length === 0) return null;
    return getDiffStats(diffResults);
  }, [diffResults]);

  // 处理提交对照
  const handleSubmit = useCallback(() => {
    if (!userInput.trim()) return;
    setHasSubmitted(true);
  }, [userInput]);

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
    setHasSubmitted(false);
  }, []);

  // 判断是否有字幕可供参考
  const hasSubtitles = sentences.length > 0;

  return (
    <div className="dictation-container">
      <div className="dictation-header">
        <h2 className="text-xl font-semibold mb-2">📝 听写模式</h2>
        <div className="dictation-info">
          <span>字幕句数: {sentences.length}</span>
          {hasSubtitles && (
            <span>当前句子: {currentSentenceIndex + 1} / {sentences.length}</span>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="input-section">
        <label className="input-label">请输入你听到的内容：</label>
        <textarea
          className="dictation-textarea"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="在此输入英文..."
          rows={4}
          disabled={hasSubmitted}
        />
      </div>

      {/* 操作按钮 */}
      <div className="button-group">
        {!hasSubmitted ? (
          <>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!userInput.trim() || !hasSubtitles}
            >
              提交对照
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={!userInput.trim()}
            >
              清空
            </button>
          </>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={handleReset}
          >
            继续听写
          </button>
        )}
      </div>

      {/* 提示信息 */}
      {!hasSubtitles && !hasSubmitted && (
        <div className="dictation-hint">
          <p>请先在播放器页面加载媒体文件并上传字幕</p>
        </div>
      )}

      {/* 提交后的对比结果 */}
      {hasSubmitted && currentSentence && (
        <div className="dictation-result-section">
          {/* 当前句子 */}
          <div className="current-sentence-box">
            <div className="sentence-label">📍 当前句子</div>
            <div className="sentence-text-display">
              {currentSentence}
            </div>
          </div>

          {/* 得分统计 */}
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
    </div>
  );
};

export default DictationMode;