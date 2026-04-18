---
name: 阶段 2 - P1 规划
description: 字幕显示 + 单词悬停卡片
phase: 2
---

# 阶段 2 - P1：字幕显示 + 单词悬停卡片

## 1. 阶段概述

### 目标
实现字幕显示和单词交互功能，包括逐句高亮、单词悬停翻译和单词详情卡片。

### 技术架构
- 组件化架构：React + Tailwind CSS
- 文本处理：逐句分析和高亮
- 单词卡片：悬停和点击交互
- API 集成：词典 API、翻译 API

## 2. 任务分解

### 2.1 创建 Transcript 组件 - 核心任务

#### 2.1.1 文本解析
```
- 需求：支持逐句显示和高亮
- 实现：创建 Transcript 组件，接收字幕文本并按句分割
- 架构：
  - Transcript.tsx - 主组件
  - TextParser.js - 文本解析工具
  - Sentence.tsx - 单句组件
```

#### 2.1.2 高亮功能
```
- 需求：根据播放进度高亮对应句子
- 实现：监听音频/视频时间变化，计算当前播放句子的索引
- 技术方案：
  - 使用 useState 管理当前句子索引
  - useEffect 监听 currentTime 变化
  - 为当前句子添加高亮样式（黄色背景）
```

#### 2.1.3 卡拉 OK 效果（可选）
```
- 需求：单词级别的高亮
- 实现：使用单词时间戳进行更细粒度的高亮
- 架构：Word.tsx 组件
```

### 2.2 单词悬停卡片

#### 2.2.1 单词识别
```
- 需求：识别可点击的单词
- 实现：对文本进行单词级别的 tokenization
- 技术方案：正则表达式 + 词汇表检查
```

#### 2.2.2 悬停交互
```
- 需求：单词悬停时显示翻译
- 实现：使用 React 事件监听
- 架构：WordTooltip.tsx 组件
```

#### 2.2.3 翻译 API 集成
```
- 需求：免费词典和翻译 API 支持
- 实现：集成免费 API
- 候选 API：
  1. Free Dictionary API（单词释义）
  2. MyMemory API（免费翻译）
  3. LibreTranslate（自托管）
- 架构：services/dictionaryApi.js
```

### 2.3 单词点击详情卡片

#### 2.3.1 卡片设计
```
- 需求：点击单词显示详细信息
- 实现：模态或浮层卡片
- 架构：WordCard.tsx
```

#### 2.3.2 词典查询
```
- 需求：获取详细的单词信息（音标、例句等）
- 实现：调用词典 API
- 架构：services/wordDetailsApi.js
```

## 3. 技术实现细节

### 3.1 文件结构
```
src/
├── components/
│   ├── Transcript/
│   │   ├── index.tsx          # 主组件
│   │   ├── TextParser.js      # 文本解析工具
│   │   ├── Sentence.tsx       # 单句组件
│   │   ├── Word.tsx           # 单词组件
│   │   └── WordTooltip.tsx    # 悬停卡片
│   └── WordCard/
│       ├── index.tsx          # 单词详情卡片
│       └── WordCard.css
└── services/
    ├── dictionaryApi.js       # 词典 API
    └── translationApi.js      # 翻译 API
```

### 3.2 API 集成计划

#### 3.2.1 免费词典 API（Free Dictionary API）
```javascript
// services/dictionaryApi.js
const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"

export const getWordDefinition = async (word) => {
  try {
    const response = await fetch(`${BASE_URL}/${word}`)
    if (!response.ok) throw new Error('Word not found')
    const data = await response.json()
    return formatWordData(data[0])
  } catch (error) {
    return null
  }
}
```

#### 3.2.2 免费翻译 API（MyMemory）
```javascript
// services/translationApi.js
const BASE_URL = "https://api.mymemory.translated.net/get"

export const translateText = async (text, from = 'en', to = 'zh-CN') => {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`)
    const data = await response.json()
    return data.responseData?.translatedText || null
  } catch (error) {
    return null
  }
}
```

### 3.3 状态管理
```javascript
// 使用 React Context 或 Zustand 管理字幕状态
const useTranscript = () => {
  const [transcript, setTranscript] = useState('')
  const [sentences, setSentences] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  
  const parseText = useCallback((text) => {
    const parsed = text.split(/[。！？.!?]\s*/)
      .filter(s => s.trim())
      .map(s => s.trim() + '.')
    setSentences(parsed)
  }, [])
  
  // 根据时间戳更新当前句子索引
  const updateCurrentSentence = useCallback((time) => {
    // 需要根据实际的句子时间戳计算
    // 简单实现：假设时间和句子索引线性相关
    setCurrentSentenceIndex(Math.floor(time / 5))
  }, [])
  
  return { transcript, sentences, currentSentenceIndex, parseText, updateCurrentSentence }
}
```

### 3.4 逐句高亮实现
```javascript
// Sentence.tsx
import React from 'react'

const Sentence = ({ text, isCurrent, onWordClick }) => {
  const words = text.split(/(\b\w+\b)/)
  
  return (
    <div className={`sentence ${isCurrent ? 'current-sentence' : ''}`}>
      {words.map((word, index) => {
        if (word.match(/\b\w+\b/)) {
          return (
            <span
              key={index}
              className="word"
              onClick={() => onWordClick(word)}
              title="点击查看详情"
            >
              {word}
            </span>
          )
        }
        return word
      })}
    </div>
  )
}

export default Sentence
```

### 3.5 样式设计（Tailwind CSS）
```css
/* WordCard/WordCard.css */
.word {
  cursor: pointer;
  transition: all 0.2s;
  padding: 0 2px;
}

.word:hover {
  background-color: rgba(245, 158, 11, 0.2);
  border-radius: 4px;
}

.current-sentence {
  background-color: rgba(255, 255, 0, 0.2);
  padding: 4px 8px;
  border-radius: 8px;
  margin: 8px 0;
}

.word-tooltip {
  position: absolute;
  z-index: 1000;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 250px;
  font-size: 14px;
}
```

## 4. 集成测试策略

### 4.1 组件测试
```
- Transcript 组件：渲染、更新、事件处理
- Sentence 组件：高亮、交互
- WordTooltip：悬停显示、位置计算
- WordCard：点击事件、API 调用
```

### 4.2 API 集成测试
```
- 翻译 API：正常和异常情况
- 词典 API：多种单词查询
- 缓存机制：防止重复请求
```

### 4.3 性能测试
```
- 大文本渲染：100+ 句
- 单词识别：边界情况
- 事件处理：1000ms 内响应
```

## 5. 进度管理

### 5.1 任务优先级
1. **P1** - 文本解析和显示
2. **P1** - 逐句高亮
3. **P2** - 单词悬停卡片
4. **P2** - 翻译 API 集成
5. **P3** - 单词详情卡片
6. **P3** - 词典查询

### 5.2 预期时间表
- **Week 1-2**：组件架构和基础实现
- **Week 3-4**：API 集成和功能优化
- **Week 5**：测试和 Bug 修复

### 5.3 验收标准
- [ ] 文本可手动粘贴或导入
- [ ] 播放时句子正确高亮
- [ ] 单词悬停显示翻译
- [ ] 单词点击显示详情卡片
- [ ] 支持基础词典和翻译功能

---

## 6. 风险与缓解

### 6.1 技术风险

#### 风险 1：免费 API 限制
- **描述**：免费 API 可能有请求频率限制
- **缓解**：实现本地缓存 + API Key 配置

#### 风险 2：文本解析不准确
- **描述**：复杂文本结构解析困难
- **缓解**：支持多种格式（.srt, .vtt, 纯文本）

#### 风险 3：性能问题
- **描述**：大文本可能导致性能下降
- **缓解**：虚拟化列表 + 懒加载

### 6.2 用户体验风险

#### 风险 1：高亮不同步
- **描述**：句子高亮与音频播放不同步
- **缓解**：支持手动调整时间戳

#### 风险 2：API 响应慢
- **描述**：网络慢导致翻译延迟
- **缓解**：骨架屏 + 加载状态

## 7. 依赖关系

### 7.1 外部依赖
- **阶段 1 完成**：音频播放器核心功能
- **API 服务可用**：翻译和词典服务

### 7.2 内部依赖
- **AudioPlayer 组件**：播放状态和时间信息
- **存储系统**：单词本和历史记录（阶段 4）

---

## 8. 后续计划

### 8.1 阶段 3（听写练习模式）
- 复用阶段 2 的文本解析逻辑
- 添加输入和验证功能
- 实现逐词对比和得分计算

### 8.2 阶段 4（生词本）
- 复用 WordCard 的单词信息
- 添加存储和检索功能
- 实现间隔复习算法
