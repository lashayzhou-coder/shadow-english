import React, { useState, useEffect } from 'react';
import './Sentence.css';
import { splitIntoWords, isWord } from './TextParser';
import { translateText } from '../../services/translationApi';

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

  useEffect(() => {
    setTranslation(initialTranslation);
  }, [initialTranslation]);

  const toggleTranslation = async () => {
    if (!showTranslation) {
      // 如果还没有翻译，直接翻译
      if (!translation && !isTranslating) {
        setIsTranslating(true);
        try {
          console.log('开始翻译:', sentence.text);
          const result = await translateText(sentence.text, 'en', 'zh-CN');
          console.log('翻译结果:', result);
          setTranslation(result || '翻译服务暂时不可用');
          if (onTranslationUpdate) {
            onTranslationUpdate(sentenceIndex, result);
          }
        } catch (error) {
          console.error('Translation error:', error);
          setTranslation('翻译失败');
        } finally {
          setIsTranslating(false);
        }
      }
      setShowTranslation(true);
    } else {
      // 收起翻译
      setShowTranslation(false);
    }
  };

  return (
    <div className={`sentence-container ${isCurrent ? 'current-sentence' : ''}`}>
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
        {showTranslation && (
          <div className="translation-content">
            <span className="translation-label">译:</span>
            <span className="translation-text">
              {translation || (isTranslating ? '翻译中...' : '点击翻译')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentence;
