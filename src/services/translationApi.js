// 文本翻译 - 使用 Gemini API
import { translateWithGemini } from './GeminiApi'

// 翻译文本
export const translateText = async (text, from = 'en', to = 'zh-CN') => {
  try {
    const translation = await translateWithGemini(text, from, to)
    return translation
  } catch (error) {
    console.error('Translation error:', error)
    return null
  }
}

// 翻译单个句子
export const translateSentence = async (text) => {
  return translateText(text, 'en', 'zh-CN')
}

// 翻译整个字幕
export const translateTranscript = async (transcript) => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const translations = []

  for (const [index, sentence] of sentences.entries()) {
    const translation = await translateText(sentence.trim(), 'en', 'zh-CN')
    if (translation) {
      translations.push({
        index,
        original: sentence.trim(),
        translated: translation.trim()
      })
    }
  }

  return translations
}

// 缓存翻译结果
const cache = new Map()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export const getCachedTranslation = async (text) => {
  const key = text.trim().toLowerCase()

  if (cache.has(key)) {
    const { translation, timestamp } = cache.get(key)
    if (Date.now() - timestamp < CACHE_TTL) {
      return translation
    }
  }

  const translation = await translateText(text)

  if (translation) {
    cache.set(key, {
      translation,
      timestamp: Date.now()
    })
  }

  return translation
}
