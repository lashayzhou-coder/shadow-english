// 文本翻译 - 支持多个翻译服务（优先 Gemini，失败后使用 MyMemory）
import { translateWithGemini } from './GeminiApi'
import { translateWithMyMemory } from './MyMemoryApi'

// 缓存翻译结果
const cache = new Map()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

// 翻译文本（自动降级）
export const translateText = async (text, from = 'en', to = 'zh-CN', useCache = true) => {
  if (!text || !text.trim()) {
    return null
  }

  const cacheKey = text.trim().toLowerCase()

  // 检查缓存
  if (useCache && cache.has(cacheKey)) {
    const { translation, timestamp } = cache.get(cacheKey)
    if (Date.now() - timestamp < CACHE_TTL) {
      console.log('[Translation] 使用缓存:', text.substring(0, 30))
      return translation
    }
  }

  let translation = null
  let errorMessage = ''

  // 优先尝试 Gemini API
  try {
    console.log('[Translation] 尝试使用 Gemini API...')
    translation = await translateWithGemini(text, from, to)
    if (translation) {
      console.log('[Translation] Gemini 翻译成功')
      cache.set(cacheKey, {
        translation,
        timestamp: Date.now()
      })
      return translation
    }
  } catch (error) {
    console.warn('[Translation] Gemini 失败:', error.message)
    errorMessage = error.message

    // 检查是否是配额问题
    if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log('[Translation] Gemini 配额已用尽，尝试 MyMemory...')
    }
  }

  // Gemini 失败后降级到 MyMemory
  try {
    console.log('[Translation] 尝试使用 MyMemory API...')
    translation = await translateWithMyMemory(text, from, to)
    if (translation) {
      console.log('[Translation] MyMemory 翻译成功')
      cache.set(cacheKey, {
        translation,
        timestamp: Date.now()
      })
      return translation
    }
  } catch (error) {
    console.warn('[Translation] MyMemory 失败:', error.message)
  }

  // 如果所有翻译服务都失败
  console.error('[Translation] 所有翻译服务都失败了')
  return null
}

// 翻译单个句子
export const translateSentence = async (text) => {
  return translateText(text, 'en', 'zh-CN')
}

// 翻译整个字幕（逐句翻译，带进度回调）
export const translateTranscript = async (transcript, onProgress = null) => {
  if (!transcript) return []

  // 按句子分割
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const translations = []

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim()
    if (!sentence) continue

    const translation = await translateText(sentence, 'en', 'zh-CN')

    translations.push({
      index: i,
      original: sentence,
      translated: translation || '(翻译失败)',
      success: !!translation
    })

    // 回调进度
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: sentences.length,
        sentence,
        translation: translation || '(翻译失败)'
      })
    }

    // 添加短暂延迟避免请求过快（特别是 MyMemory）
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return translations
}

// 获取缓存的翻译
export const getCachedTranslation = async (text) => {
  const cacheKey = text.trim().toLowerCase()

  if (cache.has(cacheKey)) {
    const { translation, timestamp } = cache.get(cacheKey)
    if (Date.now() - timestamp < CACHE_TTL) {
      return translation
    }
  }

  return null
}

// 清除翻译缓存
export const clearTranslationCache = () => {
  cache.clear()
}

export default {
  translateText,
  translateSentence,
  translateTranscript,
  getCachedTranslation,
  clearTranslationCache
}