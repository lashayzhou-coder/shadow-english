// 翻译 API 服务
// 使用 MyMemory 免费翻译 API

const BASE_URL = "https://api.mymemory.translated.net/get"

// 简单的文本翻译
export const translateText = async (text, from = 'en', to = 'zh-CN') => {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`)
    if (!response.ok) {
      throw new Error('Translation API error')
    }
    const data = await response.json()
    return data.responseData?.translatedText || null
  } catch (error) {
    console.error('Translation API error:', error)
    return null
  }
}

// 逐句翻译
export const translateSentences = async (sentences, from = 'en', to = 'zh-CN') => {
  const results = []
  for (let i = 0; i < sentences.length; i++) {
    const text = sentences[i]
    const translation = await translateText(text, from, to)
    results.push(translation || text)
    // 避免请求过快
    if (i < sentences.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  return results
}

// 简单的翻译结果缓存
const cache = new Map()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export const getCachedTranslation = async (text, from = 'en', to = 'zh-CN') => {
  const key = `${text}|${from}|${to}`
  const cached = cache.get(key)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.translation
  }

  const translation = await translateText(text, from, to)
  if (translation) {
    cache.set(key, { translation, timestamp: Date.now() })
  }
  return translation
}

// 检测文本语言（简单实现）
export const detectLanguage = async (text) => {
  const length = text.length
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length

  if (chineseCount > englishCount) {
    return 'zh-CN'
  }
  if (englishCount > 0) {
    return 'en'
  }
  return 'en'
}
