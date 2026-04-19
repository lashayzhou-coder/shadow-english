import React from 'react';
import Sentence from './Sentence';

const SentenceList = ({
  sentences,
  visibleRange,
  centerIndex,
  currentIndex,
  translations,
  wordDefinitions,
  onWordClick
}) => {
  // 安全检查：如果没有句子，不渲染
  if (!sentences || sentences.length === 0) {
    return null;
  }

  return (
    <div className="sentence-list-container">
      <div className="sentence-list">
        {sentences.map((sentence, index) => {
          const isCurrent = index === currentIndex;
          const translation = translations?.[index];

          return (
            <div key={sentence.index || index} className="sentence-item-wrapper">
              <Sentence
                sentence={sentence}
                sentenceIndex={index}
                isCurrent={isCurrent}
                translation={translation}
                wordDefinitions={wordDefinitions}
                onWordClick={onWordClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentenceList;
