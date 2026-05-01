// 音频分析上下文 - 用于在组件间共享音频分析相关的数据和函数
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';

const AudioAnalysisContext = createContext(null);

export const AudioAnalysisProvider = ({ children }) => {
  // 存储来自 AudioPlayer 的音频上下文和媒体元素引用
  const stateRef = useRef({
    mediaRef: null,
    audioContextRef: null,
    currentTime: 0
  });

  // 更新媒体引用
  const setAudioRefs = useCallback((mediaRef, audioContextRef) => {
    if (mediaRef) stateRef.current.mediaRef = mediaRef;
    if (audioContextRef) stateRef.current.audioContextRef = audioContextRef;
    console.log('[AudioAnalysis] 设置媒体引用:', {
      hasMediaRef: !!mediaRef,
      hasAudioContextRef: !!audioContextRef
    });
  }, []);

  // 更新当前播放时间
  const updateCurrentTime = useCallback((time) => {
    stateRef.current.currentTime = time;
  }, []);

  // 获取媒体引用
  const getMediaRef = useCallback(() => {
    return stateRef.current.mediaRef;
  }, []);

  // 获取音频上下文引用
  const getAudioContextRef = useCallback(() => {
    return stateRef.current.audioContextRef;
  }, []);

  // 提取音频数据
  const extractAudioData = useCallback(async (startTime, duration) => {
    const { mediaRef, audioContextRef } = stateRef.current;
    if (!mediaRef || !audioContextRef) {
      console.log('[AudioAnalysis] 媒体引用未设置');
      return null;
    }

    try {
      console.log('[AudioAnalysis] 正在提取音频数据:', { startTime, duration, src: mediaRef.src ? '有src' : '无src' });

      // 如果 src 为空或为对象 URL，等待加载
      if (!mediaRef.src || mediaRef.src.startsWith('blob:') || mediaRef.src.startsWith('object:')) {
        console.log('[AudioAnalysis] 媒体 src 为 blob 或 object，跳过 fetch');
        return null;
      }

      const response = await fetch(mediaRef.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(Math.floor((startTime + duration) * sampleRate), audioBuffer.length);
      const channelData = audioBuffer.getChannelData(0);

      console.log('[AudioAnalysis] 音频数据提取成功:', {
        sampleRate,
        startSample,
        endSample,
        samples: endSample - startSample
      });

      return channelData.slice(startSample, endSample);
    } catch (error) {
      console.error('[AudioAnalysis] 提取音频数据失败:', error);
      return null;
    }
  }, []);

  // 获取当前时间
  const getCurrentTime = useCallback(() => {
    return stateRef.current.currentTime;
  }, []);

  const value = {
    setAudioRefs,
    updateCurrentTime,
    getMediaRef,
    getAudioContextRef,
    extractAudioData,
    getCurrentTime
  };

  return (
    <AudioAnalysisContext.Provider value={value}>
      {children}
    </AudioAnalysisContext.Provider>
  );
};

export const useAudioAnalysis = () => {
  const context = useContext(AudioAnalysisContext);
  if (!context) {
    console.warn('[AudioAnalysis] Context not available');
    return {
      setAudioRefs: () => {},
      updateCurrentTime: () => {},
      extractAudioData: async () => null,
      getCurrentTime: () => 0
    };
  }
  return context;
};

export default AudioAnalysisContext;