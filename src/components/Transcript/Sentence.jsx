import { useState, useRef, useEffect } from 'react'
import './Sentence.css'
import WordTooltip from './WordTooltip'
import { splitIntoWords, isWord } from './TextParser'

const Sentence = ({
  text,
  isCurrent,
  isTranslated,
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

    // 加载单词释义（简单实现）
    setIsLoadingDefinition(true)
    try {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      const definition = getSimpleWordDefinition(word)
      setWordDefinition(definition)
    } catch (error) {
      console.error('Error loading word definition:', error)
    } finally {
      setIsLoadingDefinition(false)
    }
  }

  const handleWordMouseLeave = () => {
    setHoveredWord(null)
    setWordDefinition(null)
  }

  // 简单的单词释义查找
  const getSimpleWordDefinition = (word) => {
    const lowerWord = word.toLowerCase()

    const definitions = {
      'sample': {
        word: 'sample',
        phonetic: '/ˈsæmpəl/',
        definition: 'n. 样本，样品；v. 采样',
        examples: ['This is a sample text.', 'Please provide a sample.']
      },
      'caption': {
        word: 'caption',
        phonetic: '/ˈkæpʃn/',
        definition: 'n. 字幕，说明文字',
        examples: ['The video has English captions.', 'Add captions to your photos.']
      },
      'demonstrates': {
        word: 'demonstrates',
        phonetic: '/ˈdɛmənstreɪts/',
        definition: 'v. 演示，证明',
        examples: ['This demonstrates how it works.', 'She demonstrates great skill.']
      },
      'works': {
        word: 'works',
        phonetic: '/wɜːrks/',
        definition: 'v. 工作；运行；奏效',
        examples: ['It works perfectly.', 'The machine works efficiently.']
      },
      'highlighted': {
        word: 'highlighted',
        phonetic: '/ˈhaɪlaɪtɪd/',
        definition: 'adj. 高亮的，突出显示的',
        examples: ['The key points are highlighted.', 'Click on the highlighted text.']
      },
      'click': {
        word: 'click',
        phonetic: '/klɪk/',
        definition: 'v. 点击；咔哒声',
        examples: ['Click here to continue.', 'The button clicks easily.']
      },
      'details': {
        word: 'details',
        phonetic: '/ˈdiːteɪlz/',
        definition: 'n. 详情，细节',
        examples: ['Let me check the details.', 'I need more details.']
      },
      'hover': {
        word: 'hover',
        phonetic: '/ˈhʌvər/',
        definition: 'v. 悬停，盘旋',
        examples: ['Hover over the button for tips.', 'The bird hovers in the air.']
      },
      'translation': {
        word: 'translation',
        phonetic: '/trænzˈleɪʃn/',
        definition: 'n. 翻译，译文',
        examples: ['The translation is accurate.', 'Please provide a translation.']
      }
    }

    return definitions[lowerWord] || {
      word,
      phonetic: '',
      definition: '单词释义',
      examples: []
    }
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

      {/* 翻译（如果有） */}
      {isTranslated && translation && (
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
