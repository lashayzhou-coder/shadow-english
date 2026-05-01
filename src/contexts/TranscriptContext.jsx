import React, { createContext, useContext } from 'react';

// 创建字幕 Context
const TranscriptContext = createContext(null);

// 字幕 Provider 组件
export const TranscriptProvider = ({ children, value }) => {
  return (
    <TranscriptContext.Provider value={value}>
      {children}
    </TranscriptContext.Provider>
  );
};

// 使用字幕 Context 的 Hook
export const useTranscript = () => {
  const context = useContext(TranscriptContext);
  if (!context) {
    console.warn('useTranscript 需要在 TranscriptProvider 内使用');
    return {
      sentences: [],
      currentSentenceIndex: 0,
      timestamps: [],
      translations: [],
      mediaKey: null,
      textSource: null
    };
  }
  return context;
};

export default TranscriptContext;