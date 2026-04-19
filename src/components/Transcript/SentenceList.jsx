import React from 'react';
import Sentence from './Sentence';

const SentenceList = ({
  sentences,
  visibleRange,
  centerIndex,
  currentIndex,
  translations,
  wordDefinitions,
  onWordClick,
  onTranslationUpdate
}) => {
  // 安全检查：如果没有句子，不渲染
  if (!sentences || sentences.length === 0) {
    return null;
  }

  // 只显示可见范围内的句子
  const visibleSentences = sentences.slice(visibleRange.start, visibleRange.end + 1);

  return (
    <div className="sentence-list-container">
      <div className="sentence-list">
        {visibleSentences.map((sentence, localIndex) => {
          const globalIndex = visibleRange.start + localIndex;
          const isCurrent = globalIndex === currentIndex;
          const translation = translations?.[globalIndex];
          const isCenter = localIndex === centerIndex;

          return (
            <div
              key={sentence.index || globalIndex}
              className={`sentence-item-wrapper ${isCenter ? 'center-sentence' : ''}`}
            >
              <Sentence
                sentence={sentence}
                sentenceIndex={globalIndex}
                isCurrent={isCurrent}
                translation={translation}
                wordDefinitions={wordDefinitions}
                onWordClick={onWordClick}
                onTranslationUpdate={onTranslationUpdate}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentenceList;
