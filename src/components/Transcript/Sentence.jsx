import React, { useState } from 'react';
import './Sentence.css';
import WordTooltip from './WordTooltip';
import { splitIntoWords, isWord } from './TextParser';
import { getCachedWordDefinition } from '../../services/dictionaryApi';
import { getCachedTranslation } from '../../services/translationApi';

const Sentence = ({
  sentence,
  sentenceIndex,
  isCurrent,
  translation,
  wordDefinitions,
  onWordClick
}) => {
  const [showTranslation, setShowTranslation] = useState(false);

  const words = splitIntoWords(sentence.text);

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  return (
    <div className={`sentence-container ${isCurrent ? 'current' : ''}`}>
      {/* 句子内容 */}
      <div className="sentence-text">
        {words.map((token, tokenIndex) => {
          if (isWord(token)) {
            const wordKey = `${sentenceIndex}-${token}`;
            const definition = wordDefinitions[wordKey];

            return (
              <span key={tokenIndex} className="word-wrapper">
                <WordTooltip word={token} definition={definition} />
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
        >
          {showTranslation ? '收起' : '译'}
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
