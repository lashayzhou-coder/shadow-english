import React, { useRef } from 'react';
import { List } from 'react-window';
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
  const listRef = useRef(null);

  // 渲染单个句子项
  const renderSentenceItem = ({ index, style }) => {
    const sentence = sentences[index];
    const isCurrent = index === currentIndex;
    const translation = translations[index];

    return (
      <div style={style} className="sentence-item">
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
  };

  // 计算可见列表高度
  const visibleHeight = visibleRange.end - visibleRange.start + 1;

  return (
    <div className="sentence-list-container">
      <List
        listRef={listRef}
        height={visibleHeight * 80} // 每个句子约80px高
        rowCount={sentences.length}
        rowHeight={80}
        width="100%"
        rowComponent={renderSentenceItem}
      />
    </div>
  );
};

export default SentenceList;
