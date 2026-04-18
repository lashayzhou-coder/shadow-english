// 词典 API 服务
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
    definitions
  }
}

// 获取单词释义
export const getWordDefinition = async (word) => {
  try {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(word)}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('API error')
    }
    const data = await response.json()
    return formatWordData(data[0])
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
    return cached.data
  }

  const data = await getWordDefinition(lowerWord)
  if (data) {
    cache.set(lowerWord, { data, timestamp: Date.now() })
  }
  return data
}
