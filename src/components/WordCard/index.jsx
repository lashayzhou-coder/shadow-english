import React, { useState } from 'react';
import './WordCard.css';
import { playWordAudio } from '../../services/pronunciationApi';

const WordCard = ({ word, definition, onClose, onAddToWordBook }) => {
  const [isAddedToVocabulary, setIsAddedToVocabulary] = useState(false);

  const handlePlayAudio = async () => {
    await playWordAudio(word);
  };

  const handleAddToVocabulary = () => {
    // 实现添加到生词本逻辑
    setIsAddedToVocabulary(true);
    if (onAddToWordBook) {
      onAddToWordBook(word, definition);
    }
  };

  return (
    <div className="word-card-overlay" onClick={onClose}>
      <div className="word-card" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="close-button"
          aria-label="关闭"
        >
          ×
        </button>

        {/* 单词标题 */}
        <div className="word-header">
          <h2 className="word-title">{word}</h2>
          {definition.phonetic && (
            <div className="phonetic">{definition.phonetic}</div>
          )}
        </div>

        {/* 发音按钮 */}
        {definition.audioUrl && (
          <div className="audio-controls">
            <button
              onClick={handlePlayAudio}
              className="audio-button"
            >
              🔊 播放发音
            </button>
          </div>
        )}

        {/* 主要释义 */}
        <div className="word-definitions">
          <h3 className="definitions-title">释义</h3>
          {definition.definitions && definition.definitions.length > 0 ? (
            definition.definitions.map((meaning, index) => (
              <div key={index} className="definition-section">
                <div className="part-of-speech">{meaning.partOfSpeech}</div>
                {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                  <div key={defIndex} className="definition-item">
                    <div className="definition-text">• {def.definition}</div>
                    {def.example && (
                      <div className="definition-example">"{def.example}"</div>
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="definition-section">
              <div className="definition-text">未找到释义</div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="word-actions">
          <button
            onClick={handleAddToVocabulary}
            className={`action-button ${isAddedToVocabulary ? 'favorited' : ''}`}
          >
            {isAddedToVocabulary ? '✓ 已加入' : '★ 加入生词本'}
          </button>
          <button
            onClick={onClose}
            className="action-button secondary"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
