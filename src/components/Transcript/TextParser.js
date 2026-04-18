// 文本解析工具

// 按句子分割文本（支持中英文）
export const splitIntoSentences = (text) => {
  if (!text) return []

  // 按标点符号分割
  const sentences = text
    // 保留标点符号在句子末尾
    .replace(/([。！？.!?])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return sentences
}

// 按单词分割句子
export const splitIntoWords = (sentence) => {
  if (!sentence) return []

  // 使用正则分割单词，保留标点符号
  const tokens = sentence
    // 为单词和标点符号添加分隔符
    .replace(/([\w]+)/g, ' $1 ')
    // 处理中文（每个中文字符视为一个词）
    .replace(/([\u4e00-\u9fff])/g, ' $1 ')
    // 移除多余的空格
    .trim()
    // 分割
    .split(/\s+/)
    .filter(token => token.length > 0)

  return tokens
}

// 检查是否是单词（英文单词或中文词语）
export const isWord = (token) => {
  if (!token) return false
  // 检查是否包含字母或中文
  return /[a-zA-Z\u4e00-\u9fff]/.test(token)
}

// 检查是否是英文单词
export const isEnglishWord = (token) => {
  if (!token) return false
  // 至少包含一个字母，且大部分字符是字母
  const letters = (token.match(/[a-zA-Z]/g) || []).length
  return letters > 0 && letters / token.length > 0.5
}

// 清理文本（移除多余的空格和换行）
export const cleanText = (text) => {
  if (!text) return ''
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

// 从字幕文件格式解析（简单的 SRT 支持）
export const parseSRT = (content) => {
  if (!content) return []

  const blocks = content.split(/\n\s*\n/).filter(block => block.trim())
  const sentences = []

  for (const block of blocks) {
    const lines = block.split('\n')
    // 找到文本行（通常在时间戳后面）
    const textLines = lines.filter(line =>
      line &&
      !line.match(/^\d+$/) && // 不是纯数字
      !line.match(/^\d{2}:/) // 不是时间戳
    )
    if (textLines.length > 0) {
      sentences.push(textLines.join(' '))
    }
  }

  return sentences
}

// 自动检测文件类型并解析
export const parseTextContent = (content, filename) => {
  if (!content) return []

  // 检查是否是 SRT 格式
  const isSRT = filename?.toLowerCase().endsWith('.srt') ||
    content.includes('-->')

  if (isSRT) {
    const srtSentences = parseSRT(content)
    if (srtSentences.length > 0) {
      return srtSentences
    }
  }

  // 默认按句子分割
  return splitIntoSentences(cleanText(content))
}

// 简单的时间戳估计（用于卡拉OK效果）
export const estimateTimestamps = (sentences, totalDuration) => {
  if (!sentences.length || totalDuration <= 0) {
    return sentences.map(() => ({ start: 0, end: 0 }))
  }

  const averageDuration = totalDuration / sentences.length
  const timestamps = []

  for (let i = 0; i < sentences.length; i++) {
    const start = i * averageDuration
    const end = Math.min(start + averageDuration, totalDuration)
    timestamps.push({ start, end })
  }

  return timestamps
}

// 找到当前播放时间对应的句子索引
export const findCurrentSentenceIndex = (time, timestamps) => {
  if (!timestamps.length) return 0

  for (let i = 0; i < timestamps.length; i++) {
    const { start, end } = timestamps[i]
    if (time >= start && time <= end) {
      return i
    }
  }

  // 如果没有找到，返回最接近的
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (time >= timestamps[i].start) {
      return i
    }
  }

  return 0
}
