import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Transcript.css';
import SentenceList from './SentenceList';
import WordCard from '../WordCard';
import useSentencePositioning from '../../hooks/useSentencePositioning';
import { splitIntoSentences, estimateTimestamps, findCurrentSentenceIndex } from './TextParser';
import { getCachedTranslation } from '../../services/translationApi';
import { getCachedWordDefinition } from '../../services/dictionaryApi';
import { getTranscript, createManualTranscript, isPodcastSource } from '../../services/TranscriptionApi';
import { parseSubtitles } from '../../services/SubtitleParser';

const Transcript = ({
  currentTime,
  duration,
  onWordClick,
  audioSource,
  sourceType
}) => {
  const [transcriptText, setTranscriptText] = useState('');
  const [sentences, setSentences] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [textSource, setTextSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedWordDefinition, setSelectedWordDefinition] = useState(null);
  const [wordDefinitions, setWordDefinitions] = useState({});
  const [showWordCard, setShowWordCard] = useState(false);

  // 文本输入 ref
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 使用 Hook 计算可见句子范围和居中定位
  const { visibleRange, centerIndex } = useSentencePositioning(
    currentSentenceIndex,
    sentences.length,
    10 // 每次显示10句
  );

  // 当音频来源变化时自动加载字幕
  useEffect(() => {
    if (audioSource) {
      autoLoadTranscript();
    }
  }, [audioSource, sourceType, duration]);

  // 自动加载字幕
  const autoLoadTranscript = useCallback(async () => {
    // 检查是否启用了自动转录
    const autoTranscript = localStorage.getItem('auto_generate_transcript') === 'true';
    if (!autoTranscript) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getTranscript(audioSource, sourceType);

      if (result) {
        if (result.type === 'subtitles') {
          // 处理字幕文件格式
          processSubtitles(result.subtitles);
          setTextSource(result.source);
        } else if (result.text) {
          // 处理纯文本
          parseText(result.text);
          setTextSource(result.source);
        }
      }
    } catch (err) {
      setError('加载字幕失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [audioSource, sourceType, duration]);

  // 处理字幕文件格式
  const processSubtitles = useCallback((subtitles) => {
    if (!subtitles || subtitles.length === 0) return;

    setSentences(subtitles.map((sub, index) => ({
      text: sub.text,
      index
    })));
    setTimestamps(subtitles);
    setTranslations(new Array(subtitles.length).fill(null));
  }, []);

  // 解析字幕文本
  const parseText = useCallback((text) => {
    setTranscriptText(text);
    const parsedSentences = splitIntoSentences(text);
    setSentences(parsedSentences.map((sentence, index) => ({ text: sentence, index })));

    // 估算时间戳
    const estimatedTimestamps = estimateTimestamps(parsedSentences, duration);
    setTimestamps(estimatedTimestamps);

    // 重置翻译
    setTranslations(new Array(parsedSentences.length).fill(null));
  }, [duration]);

  // 当持续时间变化时更新时间戳
  useEffect(() => {
    if (sentences.length > 0 && textSource !== 'subtitle') {
      const estimatedTimestamps = estimateTimestamps(
        sentences.map(s => s.text),
        duration
      );
      setTimestamps(estimatedTimestamps);
    }
  }, [duration, sentences, textSource]);

  // 更新当前句子索引（根据播放时间）
  useEffect(() => {
    if (timestamps.length > 0) {
      const index = findCurrentSentenceIndex(currentTime, timestamps);
      setCurrentSentenceIndex(index);
    }
  }, [currentTime, timestamps]);

  // 处理文本提交
  const handleTextSubmit = useCallback(() => {
    const text = textAreaRef.current?.value || '';
    if (text.trim()) {
      parseText(text);
      setTextSource('manual');
    }
    setIsEditing(false);
  }, [parseText]);

  // 处理字幕文件上传
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const content = await file.text();
      const subtitles = parseSubtitles(content, file.name);

      if (subtitles.length > 0) {
        processSubtitles(subtitles);
        setTextSource('subtitle');
      } else {
        // 尝试作为纯文本解析
        parseText(content);
        setTextSource('manual');
      }
    } catch (err) {
      setError('解析字幕文件失败');
    } finally {
      setIsLoading(false);
    }
  }, [processSubtitles, parseText]);

  // 加载示例字幕
  const loadSampleText = useCallback(() => {
    const sample = `This is a sample transcript.
It demonstrates how the caption system works.
Each sentence will be highlighted as it plays.
You can click on any word to view details.
Hover over words to see translations.
This is a great tool for English learning.`;

    textAreaRef.current?.focus();
    textAreaRef.current?.select();
    setTranscriptText(sample);
  }, []);

  // 清空字幕
  const clearText = useCallback(() => {
    setTranscriptText('');
    setSentences([]);
    setTimestamps([]);
    setTranslations([]);
    setCurrentSentenceIndex(0);
    setIsEditing(false);
    setTextSource(null);
    setWordDefinitions({});
  }, []);

  // 加载翻译
  const loadTranslations = useCallback(async () => {
    const newTranslations = [];
    for (let i = 0; i < sentences.length; i++) {
      const translation = await getCachedTranslation(sentences[i].text);
      newTranslations.push(translation);
    }
    setTranslations(newTranslations);
  }, [sentences]);

  // 处理单词点击
  const handleWordClick = useCallback(async (word, sentenceIndex) => {
    const wordKey = `${sentenceIndex}-${word}`;

    // 先检查是否已缓存该单词的定义
    if (!wordDefinitions[wordKey]) {
      const definition = await getCachedWordDefinition(word);
      if (definition) {
        setWordDefinitions(prev => ({
          ...prev,
          [wordKey]: definition
        }));
        setSelectedWordDefinition(definition);
      }
    } else {
      setSelectedWordDefinition(wordDefinitions[wordKey]);
    }

    setSelectedWord(word);
    setShowWordCard(true);

    // 同时也调用父组件的 onWordClick（如果有）
    if (onWordClick) {
      onWordClick(word);
    }
  }, [wordDefinitions, onWordClick]);

  // 关闭单词卡片
  const closeWordCard = useCallback(() => {
    setShowWordCard(false);
    setSelectedWord(null);
    setSelectedWordDefinition(null);
  }, []);

  // 处理添加到生词本
  const handleAddToWordBook = useCallback((word, data) => {
    console.log('添加到生词本:', word, data);
    // 这里可以添加到生词本的逻辑
  }, []);

  return (
    <div className="transcript-container">
      {/* 字幕输入和控制 */}
      <div className="transcript-controls mb-4">
        <div className="flex flex-wrap gap-2">
          {!isEditing && transcriptText === '' && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                粘贴字幕
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                上传字幕文件
              </button>
            </>
          )}

          {isEditing && (
            <>
              <button
                onClick={handleTextSubmit}
                className="btn btn-primary"
              >
                确认
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                取消
              </button>
            </>
          )}

          {!isEditing && transcriptText !== '' && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
              >
                编辑
              </button>
              <button
                onClick={clearText}
                className="btn btn-danger"
              >
                清空
              </button>
              <button
                onClick={loadTranslations}
                className="btn btn-primary"
              >
                加载翻译
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                替换字幕
              </button>
            </>
          )}
        </div>
      </div>

      {/* 字幕编辑区域 */}
      {isEditing && (
        <div className="transcript-editor mb-4">
          <textarea
            ref={textAreaRef}
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            placeholder="请粘贴字幕文本（每行一句或段落）"
            className="w-full min-h-[200px] p-3 border rounded-md
                     focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>
      )}

      {/* 文本来源说明 */}
      {textSource && transcriptText && (
        <div className="text-source-indicator mb-4">
          字幕来源: {textSource === 'rss' && 'RSS 订阅'}
                     {textSource === 'subtitle' && '字幕文件'}
                     {textSource === 'gemini' && 'Gemini 转录'}
                     {textSource === 'vibe' && 'Vibe 转录'}
                     {textSource === 'manual' && '手动输入'}
                     {textSource === 'mock' && '示例数据'}
        </div>
      )}

      {/* 加载提示 */}
      {isLoading && (
        <div className="loading-indicator mb-4">
          <span className="animate-spin inline-block mr-2">⟳</span>
          正在加载字幕...
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="error-message mb-4">
          {error}
        </div>
      )}

      {/* 字幕显示区域 - 使用虚拟化列表 */}
      {!isEditing && sentences.length > 0 && (
        <div className="transcript-content">
          <h3 className="transcript-title mb-2">字幕</h3>
          <SentenceList
            sentences={sentences}
            visibleRange={visibleRange}
            centerIndex={centerIndex}
            currentIndex={currentSentenceIndex}
            translations={translations}
            wordDefinitions={wordDefinitions}
            onWordClick={handleWordClick}
          />
        </div>
      )}

      {/* 字幕为空时的提示 */}
      {!isEditing && sentences.length === 0 && transcriptText === '' && !isLoading && (
        <div className="transcript-empty">
          <div className="empty-icon">📄</div>
          <h3>暂无字幕</h3>
          <p>点击"粘贴字幕"或"上传字幕文件"添加字幕</p>
          {audioSource && (
            <p className="mt-2 text-sm text-gray-500">
              提示：在设置中启用"自动生成英文文本"可自动转录
            </p>
          )}
          <button
            onClick={loadSampleText}
            className="btn btn-link mt-2"
          >
            加载示例文本
          </button>
        </div>
      )}

      {/* 单词详情卡片 */}
      {showWordCard && selectedWord && selectedWordDefinition && (
        <WordCard
          word={selectedWord}
          definition={selectedWordDefinition}
          onClose={closeWordCard}
          onAddToWordBook={handleAddToWordBook}
        />
      )}
    </div>
  );
};

export default Transcript;
