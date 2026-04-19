// 转录服务 - 支持多种转录方式
import { hasGeminiApiKey, getGeminiApiKey } from './GeminiApi'
import { parsePodcastPage, getTranscriptFromPodcast, isPodcastUrl, isRssUrl } from './RssParser'
import { loadSubtitles } from './SubtitleParser'
import { mockTranscribe } from './WhisperApi'

// Gemini 音频转录
const transcribeWithGemini = async (audioBlob) => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('请先在设置中配置 Gemini API Key')
  }

  // 目前 Gemini 1.5 Pro 支持音频输入，但 API 格式较复杂
  // 这里先实现一个简单的模拟，实际项目中需要实现完整的音频转录
  throw new Error('Gemini 音频转录功能正在开发中')
}

// 检查是否是播客或 RSS 来源
export const isPodcastSource = (url) => {
  return isPodcastUrl(url) || isRssUrl(url)
}

// 自动检测字幕来源
export const findSubtitlesForSource = async (url) => {
  // 尝试从 RSS 或播客页面获取文字内容
  if (isPodcastSource(url)) {
    try {
      const transcript = await getTranscriptFromPodcast(url)
      if (transcript) {
        return {
          text: transcript,
          source: 'rss',
          type: 'text'
        }
      }
    } catch (error) {
      console.error('从 RSS 提取文字失败:', error)
    }
  }

  // 尝试查找关联的字幕文件
  const subtitleExtensions = ['srt', 'vtt']
  for (const ext of subtitleExtensions) {
    try {
      const subtitleUrl = url.replace(/\.[^/.]+$/, `.${ext}`)
      const response = await fetch(subtitleUrl)
      if (response.ok) {
        const subtitleContent = await response.text()
        const subtitles = loadSubtitles(subtitleContent, `transcript.${ext}`)
        if (subtitles.length > 0) {
          return {
            subtitles: subtitles,
            source: 'subtitle',
            type: 'subtitles'
          }
        }
      }
    } catch (error) {
      console.error(`尝试加载 ${ext} 字幕失败:`, error)
    }
  }

  return null
}

// 处理音频转录
export const transcribeAudio = async (audioBlob, sourceType, sourceUrl = null) => {
  // 根据来源类型确定转录策略
  if (sourceUrl && isPodcastSource(sourceUrl)) {
    const subtitleResult = await findSubtitlesForSource(sourceUrl)
    if (subtitleResult) {
      return subtitleResult
    }
  }

  // 尝试使用 Gemini API 转录
  if (hasGeminiApiKey()) {
    try {
      return await transcribeWithGemini(audioBlob)
    } catch (error) {
      console.error('Gemini 转录失败:', error)
    }
  }

  // 尝试使用 Vibe（需要本地配置）
  try {
    return await transcribeWithVibe(audioBlob)
  } catch (error) {
    console.error('Vibe 转录失败:', error)
  }

  // 最后使用模拟数据
  const mockResult = await mockTranscribe(60)
  return {
    text: mockResult.text,
    sentences: mockResult.sentences,
    source: 'mock',
    type: 'text'
  }
}

// Vibe 转录（本地服务）
const transcribeWithVibe = async (audioBlob) => {
  // 检查 Vibe 是否配置
  const vibeAvailable = await checkVibeAvailable()
  if (!vibeAvailable) {
    throw new Error('Vibe 转录服务未配置')
  }

  // 这里应该调用 Vibe 本地服务进行转录
  throw new Error('Vibe 转录功能正在开发中')
}

// 检查 Vibe 是否可用
const checkVibeAvailable = async () => {
  // 简单检查是否存在 Vibe 目录
  const vibePath = './vibe'
  try {
    // 在浏览器中无法直接访问文件系统，这里返回 false
    return false
  } catch (error) {
    return false
  }
}

// 主转录入口
export const getTranscript = async (audioSource, sourceType) => {
  // 安全检查
  if (!audioSource) {
    return null
  }

  // 首先尝试从音频来源获取字幕
  if (sourceType === 'url' && typeof audioSource === 'string') {
    // 对于网络音频，尝试查找字幕
    const subtitleResult = await findSubtitlesForSource(audioSource)
    if (subtitleResult) {
      return subtitleResult
    }
  }

  // 尝试转录音频（对于文件或 Blob 来源）
  if (audioSource instanceof Blob || sourceType === 'file') {
    // 对于本地文件，进行音频转录
    let transcription
    try {
      transcription = await transcribeAudio(audioSource, sourceType)
    } catch (error) {
      console.error('音频转录失败:', error)
      // 返回默认的模拟转录作为后备方案
      const mockResult = await mockTranscribe(60)
      return {
        text: mockResult.text,
        sentences: mockResult.sentences,
        source: 'mock',
        type: 'text'
      }
    }
    return transcription
  }

  return null
}

// 手动输入字幕
export const createManualTranscript = (text) => {
  return {
    text: text,
    source: 'manual',
    type: 'text'
  }
}

export default {
  getTranscript,
  createManualTranscript,
  findSubtitlesForSource,
  isPodcastSource,
  transcribeWithGemini,
  transcribeWithVibe
}
