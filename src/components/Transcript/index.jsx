import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Transcript.css';
import SentenceList from './SentenceList';
import WordCard from '../WordCard';
import useSentencePositioning from '../../hooks/useSentencePositioning';
import { splitIntoSentences, estimateTimestamps, findCurrentSentenceIndex } from './TextParser';
import { getCachedTranslation } from '../../services/translationApi';
import { translateWithMyMemory } from '../../services/MyMemoryApi';
import { translateWithGemini } from '../../services/GeminiApi';
import { getCachedWordDefinition } from '../../services/dictionaryApi';
import { getTranscript, createManualTranscript, isPodcastSource } from '../../services/TranscriptionApi';
import { parseSubtitles } from '../../services/SubtitleParser';
import { saveMediaSubtitles, saveSubtitleFile, saveMediaTranscript, generateMediaKey } from '../../services/storageService';

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
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedWordDefinition, setSelectedWordDefinition] = useState(null);
  const [wordDefinitions, setWordDefinitions] = useState({});
  const [showWordCard, setShowWordCard] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null); // 当前字幕文件名

  // 文本输入 ref
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 生成媒体唯一键用于保存字幕
  const mediaKey = audioSource ? generateMediaKey(audioSource, sourceType) : `manual-${Date.now()}`;

  // 从localStorage加载已保存的字幕状态
  useEffect(() => {
    const savedState = localStorage.getItem('transcript_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.mediaKey === mediaKey && parsed.sentences?.length > 0) {
          console.log('从localStorage恢复字幕状态');
          setSentences(parsed.sentences);
          setTimestamps(parsed.timestamps || []);
          setTranslations(parsed.translations || []);
          setTranscriptText(parsed.transcriptText || '');
          setTextSource(parsed.textSource);
          setCurrentFileName(parsed.currentFileName);
          setCurrentSentenceIndex(parsed.currentSentenceIndex || 0);
        }
      } catch (error) {
        console.error('恢复字幕状态失败:', error);
      }
    }
  }, [mediaKey]);

  // 保存字幕状态到localStorage
  useEffect(() => {
    if (sentences.length > 0 && mediaKey) {
      const stateToSave = {
        mediaKey,
        sentences,
        timestamps,
        translations,
        transcriptText,
        textSource,
        currentFileName,
        currentSentenceIndex
      };
      localStorage.setItem('transcript_state', JSON.stringify(stateToSave));
    }
  }, [sentences, timestamps, translations, transcriptText, textSource, currentFileName, currentSentenceIndex, mediaKey]);

  // 使用 Hook 计算可见句子范围和居中定位
  const { visibleRange, centerIndex } = useSentencePositioning(
    currentSentenceIndex,
    sentences.length,
    8 // 每次显示8句
  );

  // 当音频来源变化时自动加载字幕
  useEffect(() => {
    console.log('Transcript useEffect triggered:', { audioSource, sourceType });
    if (audioSource) {
      autoLoadTranscript();
    }
  }, [audioSource, sourceType]);

  // 自动加载字幕
  const autoLoadTranscript = useCallback(async () => {
    console.log('autoLoadTranscript called');

    // 检查是否启用了自动转录
    const autoTranscript = localStorage.getItem('auto_generate_transcript') === 'true';
    console.log('Auto transcript enabled:', autoTranscript);
    if (!autoTranscript) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await getTranscript(audioSource, sourceType);
      console.log('getTranscript result:', result);

      if (result) {
        if (result.type === 'subtitles') {
          // 处理字幕文件格式
          processSubtitles(result.subtitles);
          setTextSource(result.source);
        } else if (result.sentences && result.sentences.length > 0) {
          // 处理已经有句子和时间戳的数据
          setSentences(result.sentences.map((sentence, index) => ({
            text: sentence.text,
            index
          })));
          setTimestamps(result.sentences);
          setTranslations(new Array(result.sentences.length).fill(null));
          if (result.text) {
            setTranscriptText(result.text);
          }
          setTextSource(result.source);
        } else if (result.text) {
          // 处理纯文本
          parseText(result.text);
          setTextSource(result.source);
        }
      } else {
        console.log('No result from getTranscript');
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError('加载字幕失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [audioSource, sourceType]);

  // 处理字幕文件格式
  const processSubtitles = useCallback((subtitles) => {
    if (!subtitles || subtitles.length === 0) return;

    const subtitlesData = subtitles.map((sub, index) => ({
      text: sub.text,
      index,
      start: sub.start || 0,
      end: sub.end || 0
    }));

    setSentences(subtitlesData.map(s => ({ text: s.text, index: s.index })));
    setTimestamps(subtitlesData);
    setTranslations(new Array(subtitlesData.length).fill(null));

    // 保存字幕
    saveMediaSubtitles(mediaKey, subtitlesData);

    // 保存字幕文件（用于听写/跟读）
    if (currentFileName) {
      saveSubtitleFile(currentFileName, subtitlesData, []);
    }
    // 同时保存媒体转录
    saveMediaTranscript(mediaKey, subtitlesData.map(s => s.text).join('\n'), subtitlesData, []);

    // 自动加载翻译（如果启用）
    const autoTranslate = localStorage.getItem('auto_translate') === 'true';
    if (autoTranslate && subtitlesData.length > 0) {
      autoLoadTranslations(subtitlesData);
    }
  }, [mediaKey, currentFileName]);

  // 解析字幕文本
  const parseText = useCallback((text) => {
    setTranscriptText(text);
    const parsedSentences = splitIntoSentences(text);
    const sentencesData = parsedSentences.map((sentence, index) => ({
      text: sentence,
      index,
      start: 0,
      end: 0
    }));

    setSentences(sentencesData);
    setTimestamps(sentencesData);
    setTranslations(new Array(sentencesData.length).fill(null));

    // 保存字幕
    saveMediaSubtitles(mediaKey, sentencesData);
    // 保存媒体转录（用于听写/跟读）
    saveMediaTranscript(mediaKey, text, sentencesData, []);

    // 自动加载翻译（如果启用）
    const autoTranslate = localStorage.getItem('auto_translate') === 'true';
    if (autoTranslate && sentencesData.length > 0) {
      autoLoadTranslations(sentencesData);
    }
  }, [duration, mediaKey]);

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
      // 更新 mediaKey 以反映新的手动输入
      // 可以选择不更新，或者每次手动输入都创建新的 mediaKey
    }
    setIsEditing(false);
  }, [parseText]);

  // 处理字幕文件上传
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setCurrentFileName(file.name); // 保存当前文件名

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

  // 加载翻译 - 使用 Gemini API Key
  const loadTranslations = useCallback(async () => {
    if (sentences.length === 0) return;

    setIsTranslating(true);
    setTranslationProgress('开始翻译...');
    const newTranslations = [];

    // 优先使用 Gemini API
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    const useGemini = !!geminiApiKey;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].text;
      setTranslationProgress(`翻译中 (${i + 1}/${sentences.length})...`);

      let translation = null;

      if (useGemini) {
        try {
          translation = await translateWithGemini(sentence, 'en', 'zh-CN');
        } catch (error) {
          console.error('Gemini翻译失败，尝试MyMemory:', error);
        }
      }

      if (!translation) {
        try {
          translation = await translateWithMyMemory(sentence, 'en', 'zh-CN');
        } catch (error) {
          console.error('MyMemory翻译失败:', error);
        }
      }

      newTranslations.push(translation);
      setTranslations(prev => {
        const updated = [...prev];
        updated[i] = translation;
        return updated;
      });
    }

    setTranslationProgress('');
    setIsTranslating(false);

    // 保存翻译结果
    if (currentFileName) {
      saveSubtitleFile(currentFileName, sentences, newTranslations);
    }
    saveMediaTranscript(mediaKey, sentences.map(s => s.text).join('\n'), sentences, newTranslations);
  }, [sentences, mediaKey, currentFileName]);

  // 自动加载翻译（自动选择 Gemini 或 MyMemory）
  const autoLoadTranslations = useCallback(async (sentencesData) => {
    const sentencesToTranslate = sentencesData || sentences;
    if (sentencesToTranslate.length === 0) return;

    setIsTranslating(true);
    setTranslationProgress('开始翻译...');
    const newTranslations = [];

    // 检查是否有 Gemini API Key
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    const useGemini = !!geminiApiKey;

    for (let i = 0; i < sentencesToTranslate.length; i++) {
      const sentence = sentencesToTranslate[i].text;
      setTranslationProgress(`翻译中 (${i + 1}/${sentencesToTranslate.length})...`);

      let translation = null;

      if (useGemini) {
        // 优先使用 Gemini API
        try {
          translation = await translateWithGemini(sentence, 'en', 'zh-CN');
        } catch (error) {
          console.error('Gemini翻译失败，尝试MyMemory:', error);
        }
      }

      // 如果 Gemini 失败或未配置，使用 MyMemory
      if (!translation) {
        try {
          translation = await translateWithMyMemory(sentence, 'en', 'zh-CN');
        } catch (error) {
          console.error('MyMemory翻译失败:', error);
        }
      }

      newTranslations.push(translation);
      setTranslations(prev => {
        const updated = [...prev];
        updated[i] = translation;
        return updated;
      });
    }

    setTranslationProgress('');
    setIsTranslating(false);
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

  // 处理翻译更新
  const handleTranslationUpdate = useCallback((index, translation) => {
    setTranslations(prev => {
      const newTranslations = [...prev];
      newTranslations[index] = translation;
      return newTranslations;
    });
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

      {/* 翻译进度提示 */}
      {isTranslating && (
        <div className="loading-indicator mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md">
          <span className="animate-spin inline-block mr-2">⟳</span>
          {translationProgress || '正在翻译...'}
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
            onTranslationUpdate={handleTranslationUpdate}
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
