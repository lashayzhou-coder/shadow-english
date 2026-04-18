// 字幕解析器 - 支持 SRT 和 VTT 格式

// 解析 SRT 字幕格式
export const parseSRT = (content) => {
  if (!content) return []

  const blocks = content.split(/\n\s*\n/).filter(block => block.trim())
  const subtitles = []

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    if (lines.length >= 3) {
      const [index, timeCode, ...textLines] = lines

      // 解析时间码
      const timeMatch = timeCode.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
      if (timeMatch) {
        const start = parseInt(timeMatch[1]) * 3600 +
                     parseInt(timeMatch[2]) * 60 +
                     parseInt(timeMatch[3]) +
                     parseInt(timeMatch[4]) / 1000

        const end = parseInt(timeMatch[5]) * 3600 +
                   parseInt(timeMatch[6]) * 60 +
                   parseInt(timeMatch[7]) +
                   parseInt(timeMatch[8]) / 1000

        const text = textLines.join(' ').trim()
        if (text) {
          subtitles.push({
            index: parseInt(index),
            start,
            end,
            text
          })
        }
      }
    }
  }

  return subtitles
}

// 解析 VTT 字幕格式
export const parseVTT = (content) => {
  if (!content) return []

  const blocks = content.split(/\n\s*\n/).filter(block => block.trim())
  const subtitles = []

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    // 跳过 WEBVTT 文件头
    if (lines[0].toUpperCase() === 'WEBVTT') {
      continue
    }

    const [timeCode, ...textLines] = lines

    // 解析时间码
    const timeMatch = timeCode.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
    if (timeMatch) {
      const start = parseInt(timeMatch[1]) * 3600 +
                   parseInt(timeMatch[2]) * 60 +
                   parseInt(timeMatch[3]) +
                   parseInt(timeMatch[4]) / 1000

      const end = parseInt(timeMatch[5]) * 3600 +
                 parseInt(timeMatch[6]) * 60 +
                 parseInt(timeMatch[7]) +
                 parseInt(timeMatch[8]) / 1000

      const text = textLines.join(' ').trim()
      if (text) {
        subtitles.push({
          index: subtitles.length + 1,
          start,
          end,
          text
        })
      }
    }
  }

  return subtitles
}

// 自动检测字幕格式
export const parseSubtitles = (content, filename) => {
  if (!content) return []

  const lowerContent = content.toLowerCase()

  if (filename?.endsWith('.vtt') || lowerContent.includes('webvtt')) {
    return parseVTT(content)
  }

  if (filename?.endsWith('.srt') || containsTimeCodePattern(content)) {
    return parseSRT(content)
  }

  return []
}

// 检查内容是否包含时间码模式
const containsTimeCodePattern = (content) => {
  // 匹配 SRT 或 VTT 格式的时间码
  return /\d{2}[:.]\d{2}[:.]\d{2}[:,.]\d{3}.*-->/.test(content)
}

// 从 URL 或 Blob 加载字幕
export const loadSubtitles = async (source, format) => {
  if (typeof source === 'string' && source.startsWith('http')) {
    // 从 URL 加载
    const response = await fetch(source)
    const content = await response.text()
    return parseSubtitles(content, format)
  }

  if (source instanceof Blob) {
    // 从 Blob 加载
    const content = await source.text()
    return parseSubtitles(content, format)
  }

  if (typeof source === 'string') {
    // 直接文本
    return parseSubtitles(source, format)
  }

  return []
}

// 合并字幕块（用于卡拉 OK 效果）
export const mergeSubtitleBlocks = (subtitles, maxGap = 2) => {
  if (!subtitles.length) return []

  const merged = []
  let currentBlock = {
    start: subtitles[0].start,
    end: subtitles[0].end,
    text: subtitles[0].text,
    subtitles: [subtitles[0]]
  }

  for (let i = 1; i < subtitles.length; i++) {
    const subtitle = subtitles[i]
    const gap = subtitle.start - currentBlock.end

    if (gap <= maxGap && shouldMerge(subtitle, currentBlock)) {
      // 合并块
      currentBlock.end = subtitle.end
      currentBlock.text += ' ' + subtitle.text
      currentBlock.subtitles.push(subtitle)
    } else {
      // 保存并开始新块
      merged.push({
        ...currentBlock,
        duration: currentBlock.end - currentBlock.start
      })
      currentBlock = {
        start: subtitle.start,
        end: subtitle.end,
        text: subtitle.text,
        subtitles: [subtitle]
      }
    }
  }

  // 添加最后一块
  if (currentBlock) {
    merged.push({
      ...currentBlock,
      duration: currentBlock.end - currentBlock.start
    })
  }

  return merged
}

// 判断是否应该合并块
const shouldMerge = (subtitle, block) => {
  const shortTextThreshold = 50 // 字符数
  const endsWithPeriod = block.text.trim().endsWith('.')

  // 不合并包含完整句子的块
  if (endsWithPeriod) {
    return false
  }

  // 合并非常短的块
  if (block.text.length < shortTextThreshold) {
    return true
  }

  return false
}

// 查找指定时间的字幕
export const findSubtitleAtTime = (subtitles, time) => {
  return subtitles.find(sub => time >= sub.start && time <= sub.end)
}

// 获取字幕块
export const getSubtitleBlocks = (subtitles, blockSize = 5) => {
  // 按时间块分组（每 blockSize 秒为一个块）
  const blocks = []
  let currentBlock = {
    start: 0,
    end: blockSize,
    text: '',
    subtitles: []
  }

  for (const subtitle of subtitles) {
    if (subtitle.start <= currentBlock.end) {
      currentBlock.text += ' ' + subtitle.text
      currentBlock.subtitles.push(subtitle)
    } else {
      blocks.push({
        ...currentBlock,
        text: currentBlock.text.trim()
      })
      currentBlock = {
        start: currentBlock.end,
        end: currentBlock.end + blockSize,
        text: subtitle.text,
        subtitles: [subtitle]
      }
    }
  }

  if (currentBlock.subtitles.length > 0) {
    blocks.push({
      ...currentBlock,
      text: currentBlock.text.trim()
    })
  }

  return blocks.filter(block => block.text.length > 0)
}
