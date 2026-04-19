import React, { useState } from 'react';
import './Sentence.css';
import { splitIntoWords, isWord } from './TextParser';
import { translateWithGemini } from '../../services/GeminiApi';

const Sentence = ({
  sentence,
  sentenceIndex,
  isCurrent,
  translation: initialTranslation,
  wordDefinitions,
  onWordClick,
  onTranslationUpdate
}) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState(initialTranslation);
  const [isTranslating, setIsTranslating] = useState(false);

  const words = splitIntoWords(sentence.text);

  const toggleTranslation = async () => {
    if (!showTranslation && !translation && !isTranslating) {
      setIsTranslating(true);
      try {
        const result = await translateWithGemini(sentence.text, 'en', 'zh-CN');
        setTranslation(result);
        if (onTranslationUpdate) {
          onTranslationUpdate(sentenceIndex, result);
        }
      } catch (error) {
        console.error('Translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    }
    setShowTranslation(!showTranslation);
  };

  return (
    <div className={`sentence-container ${isCurrent ? 'current' : ''}`}>
      {/* 句子内容 */}
      <div className="sentence-text">
        {words.map((token, tokenIndex) => {
          if (isWord(token)) {
            return (
              <span key={tokenIndex} className="word-wrapper">
                <span
                  className="word-text"
                  onClick={() => onWordClick(token, sentenceIndex)}
                >
                  {token}
                </span>
              </span>
            );
          }
          return token;
        })}
      </div>

      {/* 翻译按钮和翻译内容 */}
      <div className="translation-section">
        <button
          className="translate-button"
          onClick={toggleTranslation}
          disabled={isTranslating}
        >
          {isTranslating ? '...' : (showTranslation ? '收起' : '译')}
        </button>
        {showTranslation && translation && (
          <div className="translation-content">
            <span className="translation-label">译:</span>
            <span className="translation-text">{translation}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentence;
