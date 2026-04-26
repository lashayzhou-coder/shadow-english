import React, { useRef, useEffect } from 'react';
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

  const listRef = useRef(null);
  const isManualScroll = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // 只显示可见范围内的句子
  const visibleSentences = sentences.slice(visibleRange.start, visibleRange.end + 1);

  // 滚动到居中位置
  useEffect(() => {
    if (listRef.current && !isManualScroll.current) {
      const container = listRef.current;
      const itemHeight = container.scrollHeight / (visibleRange.end - visibleRange.start + 1);
      const scrollPosition = (currentIndex - visibleRange.start) * itemHeight - (container.clientHeight / 2) + (itemHeight / 2);
      container.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [currentIndex, visibleRange]);

  // 处理手动滚动
  const handleScroll = (e) => {
    isManualScroll.current = true;

    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置超时恢复自动滚动
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScroll.current = false;
    }, 5000);
  };

  return (
    <div className="sentence-list-container" ref={listRef} onScroll={handleScroll}>
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
