import { useState, useRef, useEffect } from 'react'
import './Sentence.css'
import WordTooltip from './WordTooltip'
import { splitIntoWords, isWord } from './TextParser'
import { getCachedWordDefinition } from '../../services/dictionaryApi'
import { getCachedTranslation } from '../../services/translationApi'

const Sentence = ({
  text,
  isCurrent,
  translation,
  onWordClick,
  startTime,
  endTime,
  index
}) => {
  const [hoveredWord, setHoveredWord] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [wordDefinition, setWordDefinition] = useState(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)

  // 工具提示 ref
  const tooltipRef = useRef(null)

  // 分割单词
  const words = splitIntoWords(text)

  // 处理单词悬停
  const handleWordMouseEnter = async (word, event) => {
    setHoveredWord(word)
    setHoverPosition({
      x: event.clientX,
      y: event.clientY
    })

    // 加载单词释义
    setIsLoadingDefinition(true)
    try {
      const definition = await getCachedWordDefinition(word)

      // 如果 API 返回数据，格式化它；否则使用简单格式
      if (definition) {
        // 同时获取中文翻译
        const translation = await getCachedTranslation(word)

        setWordDefinition({
          ...definition,
          translation
        })
      } else {
        // API 没有找到，使用简单格式
        const translation = await getCachedTranslation(word)
        setWordDefinition({
          word,
          phonetic: '',
          definitions: [],
          translation
        })
      }
    } catch (error) {
      console.error('Error loading word definition:', error)
      // 出错时显示简单格式
      setWordDefinition({
        word,
        phonetic: '',
        definitions: [],
        translation: null
      })
    } finally {
      setIsLoadingDefinition(false)
    }
  }

  const handleWordMouseLeave = () => {
    setHoveredWord(null)
    setWordDefinition(null)
  }

  // 格式化单词（保留标点符号）
  const formatWord = (word) => {
    return word.replace(/[^\w']/g, '')
  }

  return (
    <div className={`sentence-container ${isCurrent ? 'current' : ''}`}
         data-index={index}>
      {/* 句子编号和时间戳（可选） */}
      {startTime !== undefined && endTime !== undefined && (
        <div className="sentence-timestamp">
          <span className="time">{startTime.toFixed(1)}-{endTime.toFixed(1)}</span>
        </div>
      )}

      {/* 句子内容 */}
      <div className="sentence-text">
        {words.map((token, tokenIndex) => {
          if (isWord(token)) {
            const formattedWord = formatWord(token)
            return (
              <span
                key={tokenIndex}
                className="word"
                onMouseEnter={(e) => handleWordMouseEnter(formattedWord, e)}
                onMouseLeave={handleWordMouseLeave}
                onClick={() => onWordClick(formattedWord)}
                data-word={formattedWord}
              >
                {token}
              </span>
            )
          }
          return token
        })}
      </div>

      {/* 翻译显示（默认显示） */}
      {translation && (
        <div className="sentence-translation">
          <span className="translation-label">译:</span>
          <span className="translation-text">{translation}</span>
        </div>
      )}

      {/* 单词悬停卡片 */}
      {hoveredWord && (
        <WordTooltip
          word={hoveredWord}
          definition={wordDefinition}
          isLoading={isLoadingDefinition}
          position={hoverPosition}
          onClose={handleWordMouseLeave}
        />
      )}
    </div>
  )
}

export default Sentence
