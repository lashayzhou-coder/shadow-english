// 词典 API 服务
import { translateWithGemini } from './GeminiApi'

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"

// 格式化单词数据
const formatWordData = (data) => {
  if (!data) return null

  const word = data.word
  const phonetic = data.phonetic || (data.phonetics?.[0]?.text) || ''
  const audioUrl = data.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio || ''

  const definitions = data.meanings?.map(meaning => ({
    partOfSpeech: meaning.partOfSpeech,
    definitions: meaning.definitions?.slice(0, 3).map(def => ({
      definition: def.definition,
      example: def.example || null
    })) || []
  })) || []

  return {
    word,
    phonetic,
    audioUrl,
    definitions,
    chineseTranslation: null
  }
}

// 获取单词释义
export const getWordDefinition = async (word) => {
  try {
    console.log('获取单词释义:', word)
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(word)}`)
    if (!response.ok) {
      if (response.status === 404) {
        // 没有找到词典释义，只返回基本信息和翻译
        console.log('词典API未找到，仅返回翻译')
        const basicData = {
          word,
          phonetic: '',
          audioUrl: '',
          definitions: []
        }
        // 获取中文释义
        try {
          const translation = await translateWithGemini(word, 'en', 'zh-CN')
          console.log('获取到的中文翻译:', translation)
          basicData.chineseTranslation = translation
        } catch (translationError) {
          console.error('Translation error:', translationError)
        }
        return basicData
      }
      throw new Error('API error')
    }
    const data = await response.json()
    const formattedData = formatWordData(data[0])
    console.log('格式化的单词数据:', formattedData)

    // 获取中文释义
    try {
      console.log('开始翻译单词:', word)
      const translation = await translateWithGemini(word, 'en', 'zh-CN')
      console.log('获取到的中文翻译:', translation)
      formattedData.chineseTranslation = translation
    } catch (translationError) {
      console.error('Translation error:', translationError)
    }

    console.log('返回的完整数据:', formattedData)
    return formattedData
  } catch (error) {
    console.error('Dictionary API error:', error)
    return null
  }
}

// 简单缓存
const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export const getCachedWordDefinition = async (word) => {
  const lowerWord = word.toLowerCase()
  const cached = cache.get(lowerWord)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log('使用缓存的单词释义:', cached.data)
    return cached.data
  }

  const data = await getWordDefinition(lowerWord)
  if (data) {
    cache.set(lowerWord, { data, timestamp: Date.now() })
  }
  return data
}
