---
name: 阶段 2 - P2 规划
description: 字幕组件重写 - 逐句展示、居中高亮、单词交互
phase: 2
---

# 阶段 2 - P2：字幕组件重写

## 1. 阶段概述

### 目标
重新实现字幕组件，支持：
- 每次展示10句英文，当前播放句居中高亮
- 逐句展示，卡拉OK效果
- 每句有「译」按钮，点击展开翻译
- 右侧滑动功能
- 单词悬停和点击交互（参考 Language Reactor）
- 完整的单词详情卡片

### 技术架构
- 组件化架构：React + Tailwind CSS
- 虚拟化列表：react-window 或 react-virtual
- 文本处理：逐句分析和高亮
- 单词交互：悬停气泡卡片和详情卡片
- API 集成：Free Dictionary API + MyMemory 翻译 API

## 2. 任务分解

### 2.1 创建新的 Transcript 组件

#### 2.1.1 组件架构
```
src/components/Transcript/
├── index.jsx           # 主组件 - 管理整体状态和布局
├── Transcript.css      # 样式文件
├── Sentence.jsx        # 单句组件 - 支持高亮和翻译
├── Word.jsx            # 单词组件 - 悬停和点击交互
├── WordTooltip.jsx     # 悬停气泡卡片
├── WordCard.jsx        # 单词详情卡片
└── TextParser.js       # 文本解析工具
```

#### 2.1.2 虚拟列表实现
```
- 需求：只渲染可见区域的句子，支持大量文本的高效渲染
- 实现：使用 react-window 库
- 架构：虚拟化列表容器 + 动态高度计算
```

#### 2.1.3 居中高亮算法
```
- 需求：当前播放的句子位于视图中央
- 实现：根据滚动位置和句子索引计算偏移量
- 技术方案：
  - 使用 useRef 监听滚动容器
  - 根据当前句子索引计算滚动位置
  - 平滑滚动动画
```

### 2.2 Sentence 组件实现

#### 2.2.1 逐句展示
```
- 需求：每次只显示10句，支持上下滑动
- 实现：
  - 计算当前可见区域的句子范围
  - 虚拟列表只渲染可见句子
  - 支持快速滑动和滚动定位
```

#### 2.2.2 卡拉OK高亮效果
```
- 需求：当前播放进度对应的句子高亮
- 实现：
  - 监听音频时间变化
  - 根据时间戳计算当前句子索引
  - 高亮样式：黄色背景 + 边框
```

#### 2.2.3 翻译功能
```
- 需求：每句右侧或下方有「译」图标，点击展开翻译
- 实现：
  - 翻译按钮：小图标，位于句子右侧
  - 翻译展开：使用状态管理显示/隐藏
  - 翻译API：集成 MyMemory API
```

### 2.3 单词交互实现

#### 2.3.1 单词悬停
```
- 需求：悬停显示单词 + 中文释义
- 实现：
  - 单词识别：正则表达式匹配
  - 气泡卡片：使用 absolute 定位
  - 延迟显示：避免快速悬停触发
  - 翻译API：MyMemory 翻译 API
```

#### 2.3.2 单词点击
```
- 需求：点击显示详细卡片
- 实现：
  - 单词详情卡片：模态框或浮层
  - 音标显示：IPA 国际音标
  - 词性+释义：多义项支持
  - 例句：来自 Free Dictionary API
  - 发音播放：API 返回的音频 URL
  - 生词本功能：添加到本地存储
```

## 3. 技术实现细节

### 3.1 主组件结构
```javascript
// src/components/Transcript/index.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import Sentence from './Sentence'
import WordCard from './WordCard'
import { splitIntoSentences, estimateTimestamps } from './TextParser'
import { getCachedTranslation } from '../../services/translationApi'
import './Transcript.css'

const Transcript = ({ currentTime, duration, onWordClick, audioSource }) => {
  const [transcriptText, setTranscriptText] = useState('')
  const [sentences, setSentences] = useState([])
  const [timestamps, setTimestamps] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [selectedWord, setSelectedWord] = useState(null)
  const [translations, setTranslations] = useState([])
  const listRef = useRef(null)

  // 计算可见范围（每次显示10句）
  const visibleRange = 10
  const halfVisible = Math.floor(visibleRange / 2)

  // 解析文本
  const parseText = useCallback((text) => {
    const parsedSentences = splitIntoSentences(text)
    setSentences(parsedSentences)
    setTimestamps(estimateTimestamps(parsedSentences, duration))
  }, [duration])

  // 更新当前句子索引
  useEffect(() => {
    if (timestamps.length > 0) {
      const index = timestamps.findIndex(
        ts => currentTime >= ts.start && currentTime <= ts.end
      )
      if (index !== -1) {
        setCurrentSentenceIndex(index)
        // 居中滚动
        if (listRef.current) {
          listRef.current.scrollToItem(index, 'center')
        }
      }
    }
  }, [currentTime, timestamps])

  // 加载翻译
  const loadTranslations = useCallback(async () => {
    const newTranslations = await Promise.all(
      sentences.map(getCachedTranslation)
    )
    setTranslations(newTranslations)
  }, [sentences])

  // 渲染项目
  const renderRow = ({ index, style }) => {
    const sentence = sentences[index]
    const isCurrent = index === currentSentenceIndex
    const translation = translations[index]
    
    return (
      <div style={style} className="sentence-item">
        <Sentence
          key={index}
          text={sentence}
          isCurrent={isCurrent}
          translation={translation}
          onWordClick={(word) => {
            setSelectedWord(word)
            onWordClick(word)
          }}
          index={index}
        />
      </div>
    )
  }

  return (
    <div className="transcript-container">
      <div className="transcript-scroll-container">
        <List
          height={400} // 容器高度
          itemCount={sentences.length}
          itemSize={80} // 每个句子高度
          width="100%"
          ref={listRef}
        >
          {renderRow}
        </List>
      </div>

      {selectedWord && (
        <WordCard
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onAddToWordBook={(word, data) => {
            console.log('添加到生词本:', word, data)
          }}
        />
      )}
    </div>
  )
}

export default Transcript
```

### 3.2 Sentence 组件
```javascript
// src/components/Transcript/Sentence.jsx
import { useState, useCallback } from 'react'
import Word from './Word'
import { splitIntoWords, isWord } from './TextParser'
import './Sentence.css'

const Sentence = ({
  text,
  isCurrent,
  translation,
  onWordClick,
  index
}) => {
  const [showTranslation, setShowTranslation] = useState(false)

  const words = splitIntoWords(text)

  const toggleTranslation = useCallback(() => {
    setShowTranslation(!showTranslation)
  }, [showTranslation])

  return (
    <div className={`sentence-container ${isCurrent ? 'current-sentence' : ''}`}>
      {/* 句子内容 */}
      <div className="sentence-text">
        {words.map((token, tokenIndex) => {
          if (isWord(token)) {
            return (
              <Word
                key={tokenIndex}
                word={token}
                onWordClick={onWordClick}
              />
            )
          }
          return token
        })}
      </div>

      {/* 翻译按钮 */}
      {translation && (
        <button
          onClick={toggleTranslation}
          className="translate-toggle"
          title="显示/隐藏翻译"
        >
          译
        </button>
      )}

      {/* 翻译显示 */}
      {showTranslation && translation && (
        <div className="sentence-translation">
          <span className="translation-text">{translation}</span>
        </div>
      )}
    </div>
  )
}

export default Sentence
```

### 3.3 Word 组件
```javascript
// src/components/Transcript/Word.jsx
import { useState, useCallback } from 'react'
import WordTooltip from './WordTooltip'
import { getCachedWordDefinition } from '../../services/dictionaryApi'
import './Word.css'

const Word = ({ word, onWordClick }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [wordDefinition, setWordDefinition] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleMouseEnter = useCallback(async () => {
    setShowTooltip(true)
    setIsLoading(true)
    try {
      const definition = await getCachedWordDefinition(word)
      setWordDefinition(definition)
    } catch (error) {
      console.error('获取单词释义失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [word])

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false)
  }, [])

  const handleClick = useCallback(() => {
    onWordClick(word)
  }, [word, onWordClick])

  return (
    <>
      <span
        className="word"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-word={word}
      >
        {word}
      </span>

      {showTooltip && (
        <WordTooltip
          word={word}
          definition={wordDefinition}
          isLoading={isLoading}
          onClose={handleMouseLeave}
        />
      )}
    </>
  )
}

export default Word
```

### 3.4 WordTooltip 组件
```javascript
// src/components/Transcript/WordTooltip.jsx
import { useState, useRef, useEffect } from 'react'
import './WordTooltip.css'

const WordTooltip = ({ word, definition, isLoading, onClose }) => {
  const tooltipRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (isLoading) {
    return (
      <div className="word-tooltip" ref={tooltipRef}>
        <span className="loading-text">加载中...</span>
      </div>
    )
  }

  if (!definition) {
    return null
  }

  return (
    <div className="word-tooltip" ref={tooltipRef}>
      <div className="tooltip-word">{word}</div>
      <div className="tooltip-translation">
        {definition.translation || definition.definition}
      </div>
    </div>
  )
}

export default WordTooltip
```

### 3.5 WordCard 组件
```javascript
// src/components/Transcript/WordCard.jsx
import { useState, useCallback, useEffect } from 'react'
import { getCachedWordDefinition } from '../../services/dictionaryApi'
import './WordCard.css'

const WordCard = ({ word, onClose, onAddToWordBook }) => {
  const [wordDefinition, setWordDefinition] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadDefinition = async () => {
      setIsLoading(true)
      try {
        const definition = await getCachedWordDefinition(word)
        setWordDefinition(definition)
      } catch (error) {
        console.error('获取单词详情失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDefinition()
  }, [word])

  const handlePlayPronunciation = useCallback(() => {
    if (wordDefinition?.phonetics?.[0]?.audio) {
      const audio = new Audio(wordDefinition.phonetics[0].audio)
      audio.play()
    }
  }, [wordDefinition])

  const handleAddToWordBook = useCallback(() => {
    if (onAddToWordBook && wordDefinition) {
      onAddToWordBook(word, wordDefinition)
    }
  }, [onAddToWordBook, wordDefinition, word])

  if (isLoading) {
    return (
      <div className="word-card">
        <div className="card-header">
          <span className="card-word">{word}</span>
          <button onClick={onClose} className="card-close">×</button>
        </div>
        <div className="card-content">
          <div className="loading-text">加载中...</div>
        </div>
      </div>
    )
  }

  if (!wordDefinition) {
    return null
  }

  return (
    <div className="word-card">
      <div className="card-header">
        <span className="card-word">{word}</span>
        <button onClick={onClose} className="card-close">×</button>
      </div>

      <div className="card-content">
        {/* 音标 */}
        {wordDefinition.phonetic && (
          <div className="phonetic">
            {wordDefinition.phonetic}
          </div>
        )}

        {/* 词性和释义 */}
        {wordDefinition.meanings && wordDefinition.meanings.length > 0 && (
          <div className="meanings">
            {wordDefinition.meanings.map((meaning, index) => (
              <div key={index} className="meaning">
                <div className="part-of-speech">{meaning.partOfSpeech}</div>
                <ul className="definitions">
                  {meaning.definitions.map((def, idx) => (
                    <li key={idx} className="definition">
                      {def.definition}
                      {def.example && (
                        <div className="example">
                          例：{def.example}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 发音按钮 */}
        {wordDefinition.phonetics && wordDefinition.phonetics.length > 0 && (
          <div className="pronunciation">
            <button
              onClick={handlePlayPronunciation}
              className="pronunciation-button"
              disabled={!wordDefinition.phonetics[0]?.audio}
            >
              🎵 播放发音
            </button>
          </div>
        )}

        {/* 生词本按钮 */}
        <div className="word-book">
          <button
            onClick={handleAddToWordBook}
            className="word-book-button"
          >
            ★ 加入生词本
          </button>
        </div>
      </div>
    </div>
  )
}

export default WordCard
```

### 3.6 API 服务
```javascript
// src/services/dictionaryApi.js - Free Dictionary API
const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"

// 简单的缓存机制
const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时

export const getCachedWordDefinition = async (word) => {
  const key = word.toLowerCase()
  const cached = cache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await fetch(`${BASE_URL}/${word}`)
    if (!response.ok) throw new Error('Word not found')
    
    const data = await response.json()
    const formatted = formatWordData(data[0])
    
    cache.set(key, {
      data: formatted,
      timestamp: Date.now()
    })
    
    return formatted
  } catch (error) {
    console.error('Dictionary API error:', error)
    return null
  }
}

const formatWordData = (data) => {
  return {
    word: data.word,
    phonetic: data.phonetic,
    phonetics: data.phonetics,
    meanings: data.meanings.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map(def => ({
        definition: def.definition,
        example: def.example,
        synonyms: def.synonyms
      }))
    })),
    translation: data.translation || null
  }
}

// src/services/translationApi.js - MyMemory API
const BASE_URL = "https://api.mymemory.translated.net/get"

export const getCachedTranslation = async (text, from = 'en', to = 'zh-CN') => {
  const key = `${text}|${from}|${to}`
  const cached = cache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.translation
  }

  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`)
    const data = await response.json()
    
    if (data.responseStatus === 200 && data.responseData) {
      const translation = data.responseData.translatedText
      
      cache.set(key, {
        translation,
        timestamp: Date.now()
      })
      
      return translation
    }
    
    return null
  } catch (error) {
    console.error('Translation API error:', error)
    return null
  }
}
```

## 4. 样式设计

### 4.1 主容器样式
```css
/* src/components/Transcript/Transcript.css */
.transcript-container {
  position: relative;
  height: 400px;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.transcript-scroll-container {
  height: 100%;
  width: 100%;
}

/* 虚拟化列表项样式 */
.sentence-item {
  padding: 8px 16px;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

### 4.2 句子样式
```css
/* src/components/Transcript/Sentence.css */
.sentence-container {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 6px;
}

.sentence-container.current-sentence {
  background-color: rgba(253, 224, 71, 0.2);
  border: 2px solid #fbbf24;
  padding: 12px;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
}

.sentence-text {
  flex: 1;
  font-size: 1.1rem;
  line-height: 1.6;
  color: #1f2937;
}

.translate-toggle {
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.translate-toggle:hover {
  background-color: #2563eb;
}

.sentence-translation {
  margin-top: 8px;
  padding: 8px;
  background-color: #f3f4f6;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.5;
}

.translation-text {
  font-style: italic;
}
```

### 4.3 单词样式
```css
/* src/components/Transcript/Word.css */
.word {
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  transition: all 0.2s;
  position: relative;
  display: inline-block;
}

.word:hover {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.word:active {
  background-color: rgba(59, 130, 246, 0.2);
}
```

### 4.4 悬停气泡样式
```css
/* src/components/Transcript/WordTooltip.css */
.word-tooltip {
  position: absolute;
  z-index: 1000;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  max-width: 250px;
  font-size: 0.9rem;
  pointer-events: none;
  transform: translateY(-5px);
}

.tooltip-word {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.tooltip-translation {
  color: #4b5563;
  font-size: 0.85rem;
  line-height: 1.4;
}

.loading-text {
  color: #6b7280;
  font-style: italic;
}
```

### 4.5 单词卡片样式
```css
/* src/components/Transcript/WordCard.css */
.word-card {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 300px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  z-index: 2000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.card-word {
  font-weight: 600;
  font-size: 1.2rem;
  color: #1f2937;
}

.card-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
}

.card-close:hover {
  color: #1f2937;
}

.card-content {
  padding: 16px;
}

.phonetic {
  font-style: italic;
  color: #6b7280;
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.meanings {
  margin-bottom: 16px;
}

.meaning {
  margin-bottom: 12px;
}

.part-of-speech {
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.definitions {
  list-style: none;
  padding-left: 0;
}

.definition {
  margin-bottom: 8px;
  color: #4b5563;
  line-height: 1.5;
}

.example {
  margin-top: 4px;
  font-style: italic;
  color: #6b7280;
  font-size: 0.85rem;
}

.pronunciation {
  margin-bottom: 12px;
}

.pronunciation-button {
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.pronunciation-button:hover:not(:disabled) {
  background-color: #059669;
}

.pronunciation-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.word-book-button {
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
  width: 100%;
}

.word-book-button:hover {
  background-color: #d97706;
}
```

## 5. 测试策略

### 5.1 组件测试
```
- Transcript 组件：渲染、更新、事件处理
- Sentence 组件：高亮、翻译展开
- Word 组件：悬停和点击
- WordTooltip：气泡显示、位置计算
- WordCard：API 调用、音频播放
```

### 5.2 性能测试
```
- 大文本渲染：1000+ 句的加载和滚动
- 虚拟列表：渲染性能和内存占用
- 单词识别：边界情况和特殊字符
- 事件响应：1000ms 内响应
```

### 5.3 API 测试
```
- 翻译 API：正常和异常情况
- 词典 API：多种单词查询
- 缓存机制：防止重复请求
```

## 6. 风险与缓解

### 6.1 技术风险

#### 风险 1：API 限制
- **描述**：免费 API 可能有请求频率限制
- **缓解**：实现本地缓存 + API Key 配置

#### 风险 2：虚拟列表性能
- **描述**：大量文本可能导致虚拟列表性能问题
- **缓解**：优化渲染逻辑，添加懒加载

#### 风险 3：高亮同步
- **描述**：句子高亮与音频播放可能不同步
- **缓解**：实现平滑滚动和时间戳校准

### 6.2 用户体验风险

#### 风险 1：移动端适配
- **描述**：小屏幕可能无法显示完整内容
- **缓解**：响应式设计，调整可见句子数量

#### 风险 2：网络延迟
- **描述**：API 响应慢导致翻译延迟
- **缓解**：骨架屏 + 加载状态 + 重试机制

## 7. 进度管理

### 7.1 任务优先级
1. **P1** - 组件架构和基础实现
2. **P1** - 虚拟列表和居中高亮
3. **P2** - 单词悬停和点击交互
4. **P2** - API 集成和功能优化
5. **P3** - 单词详情卡片
6. **P3** - 音频播放和生词本功能

### 7.2 预期时间表
- **Week 1-2**：组件架构和基础实现
- **Week 3**：API 集成和功能优化
- **Week 4**：测试和 Bug 修复

### 7.3 验收标准
- [ ] 每次只显示10句英文，当前句居中高亮
- [ ] 逐句展示，支持上下滑动
- [ ] 每句有「译」按钮，点击展开翻译
- [ ] 单词悬停显示气泡卡片
- [ ] 单词点击显示详情卡片
- [ ] 支持音频播放和生词本功能

## 8. 依赖关系

### 8.1 外部依赖
- react-window：虚拟化列表
- audio 元素：音频播放
- Free Dictionary API：词典查询
- MyMemory API：翻译

### 8.2 内部依赖
- AudioPlayer 组件：播放状态和时间信息
- IndexedDB：单词本存储（后续阶段）
