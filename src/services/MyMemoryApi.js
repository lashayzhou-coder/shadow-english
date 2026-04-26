// MyMemory 翻译 API - 免费翻译服务
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get'

// 翻译文本
export const translateWithMyMemory = async (text, from = 'en', to = 'zh-CN') => {
  if (!text || !text.trim()) {
    return null
  }

  try {
    const langPair = `${from}|${to}`
    const encodedText = encodeURIComponent(text.trim())
    const url = `${MYMEMORY_API_URL}?q=${encodedText}&langpair=${langPair}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText
    }

    throw new Error(data.responseDetails || '翻译失败')
  } catch (error) {
    console.error('MyMemory translation error:', error)
    return null
  }
}

// 批量翻译句子
export const translateSentencesWithMyMemory = async (sentences, from = 'en', to = 'zh-CN') => {
  const results = []

  for (const sentence of sentences) {
    const translation = await translateWithMyMemory(sentence, from, to)
    results.push({
      original: sentence,
      translated: translation || ''
    })
    // 添加短暂延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}

export default {
  translateWithMyMemory,
  translateSentencesWithMyMemory
}
