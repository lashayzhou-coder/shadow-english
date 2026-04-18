import { useState, useRef, useEffect, useCallback } from 'react'
import './Transcript.css'
import Sentence from './Sentence'
import {
  splitIntoSentences,
  estimateTimestamps,
  findCurrentSentenceIndex
} from './TextParser'

const Transcript = ({ currentTime, duration, onWordClick }) => {
  const [transcriptText, setTranscriptText] = useState('')
  const [sentences, setSentences] = useState([])
  const [timestamps, setTimestamps] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translations, setTranslations] = useState([])

  // 文本输入 ref
  const textAreaRef = useRef(null)

  // 解析字幕文本
  const parseText = useCallback((text) => {
    const parsedSentences = splitIntoSentences(text)
    setSentences(parsedSentences)

    // 估算时间戳
    const estimatedTimestamps = estimateTimestamps(parsedSentences, duration)
    setTimestamps(estimatedTimestamps)

    // 重置翻译
    setTranslations(new Array(parsedSentences.length).fill(null))
  }, [duration])

  // 当持续时间变化时更新时间戳
  useEffect(() => {
    if (sentences.length > 0) {
      const estimatedTimestamps = estimateTimestamps(sentences, duration)
      setTimestamps(estimatedTimestamps)
    }
  }, [duration, sentences])

  // 更新当前句子索引（根据播放时间）
  useEffect(() => {
    if (timestamps.length > 0) {
      const index = findCurrentSentenceIndex(currentTime, timestamps)
      setCurrentSentenceIndex(index)
    }
  }, [currentTime, timestamps])

  // 处理文本提交
  const handleTextSubmit = useCallback(() => {
    const text = textAreaRef.current?.value || ''
    if (text.trim()) {
      parseText(text)
    }
    setIsEditing(false)
  }, [parseText])

  // 加载示例字幕
  const loadSampleText = useCallback(() => {
    const sample = `This is a sample transcript.
It demonstrates how the caption system works.
Each sentence will be highlighted as it plays.
You can click on any word to view details.
Hover over words to see translations.
This is a great tool for English learning.`

    textAreaRef.current?.focus()
    textAreaRef.current?.select()
    setTranscriptText(sample)
  }, [])

  // 清空字幕
  const clearText = useCallback(() => {
    setTranscriptText('')
    setSentences([])
    setTimestamps([])
    setTranslations([])
    setCurrentSentenceIndex(0)
    setIsEditing(false)
  }, [])

  // 格式化时间
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // 获取句子的翻译（简化版，实际需要调用 API）
  const getSentenceTranslation = useCallback(async (sentence, index) => {
    // 简单实现 - 实际应该调用翻译 API
    if (sentence.toLowerCase().includes('sample')) {
      return '这是一个示例字幕'
    }
    if (sentence.toLowerCase().includes('caption')) {
      return '它演示了字幕系统的工作原理'
    }
    if (sentence.toLowerCase().includes('highlighted')) {
      return '每个句子播放时都会高亮显示'
    }
    if (sentence.toLowerCase().includes('details')) {
      return '您可以点击任意单词查看详情'
    }
    if (sentence.toLowerCase().includes('translation')) {
      return '悬停在单词上可查看翻译'
    }
    if (sentence.toLowerCase().includes('learning')) {
      return '这是一个很好的英语学习工具'
    }
    return null
  }, [])

  // 加载翻译
  const loadTranslations = useCallback(async () => {
    const newTranslations = []
    for (let i = 0; i < sentences.length; i++) {
      const translation = await getSentenceTranslation(sentences[i], i)
      newTranslations.push(translation)
    }
    setTranslations(newTranslations)
    setShowTranslation(true)
  }, [sentences, getSentenceTranslation])

  return (
    <div className="transcript-container">
      {/* 字幕输入和控制 */}
      <div className="transcript-controls mb-4">
        <div className="flex gap-2">
          {!isEditing && transcriptText === '' && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
            >
              粘贴字幕
            </button>
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
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
            >
              编辑
            </button>
          )}

          {!isEditing && transcriptText !== '' && (
            <button
              onClick={clearText}
              className="btn btn-danger"
            >
              清空
            </button>
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
          <div className="editor-hints mt-2 text-sm text-gray-500">
            <p>提示：</p>
            <ul>
              <li>• 文本会自动分割为句子</li>
              <li>• 支持 .srt 格式字幕</li>
              <li>• 时间戳会自动估算</li>
            </ul>
          </div>
        </div>
      )}

      {/* 翻译控制 */}
      {!isEditing && sentences.length > 0 && (
        <div className="translation-controls mb-4">
          <button
            onClick={loadTranslations}
            disabled={showTranslation}
            className="btn btn-secondary"
          >
            {showTranslation ? '已翻译' : '加载翻译'}
          </button>
        </div>
      )}

      {/* 字幕显示区域 */}
      {!isEditing && sentences.length > 0 && (
        <div className="transcript-content">
          <h3 className="transcript-title mb-2">字幕</h3>

          {sentences.map((sentence, index) => {
            const isCurrent = index === currentSentenceIndex
            const timestamp = timestamps[index]

            return (
              <Sentence
                key={index}
                text={sentence}
                isCurrent={isCurrent}
                isTranslated={showTranslation}
                translation={translations[index]}
                onWordClick={onWordClick}
                startTime={timestamp?.start}
                endTime={timestamp?.end}
                index={index}
              />
            )
          })}
        </div>
      )}

      {/* 字幕为空时的提示 */}
      {!isEditing && sentences.length === 0 && transcriptText === '' && (
        <div className="transcript-empty">
          <div className="empty-icon">📄</div>
          <h3>暂无字幕</h3>
          <p>点击"粘贴字幕"添加字幕文本</p>
        </div>
      )}

      {/* 快捷键提示 */}
      {!isEditing && sentences.length > 0 && (
        <div className="transcript-hints mt-4">
          <p className="text-sm text-gray-600">
            💡 <strong>提示：</strong>播放时字幕会自动高亮
          </p>
        </div>
      )}
    </div>
  )
}

export default Transcript
