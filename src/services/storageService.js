// 本地存储管理服务

const STORAGE_KEYS = {
  RECENT_MEDIA: 'shadow-english-recent-media',
  MEDIA_SUBTITLES: 'shadow-english-media-subtitles',
  VOCABULARY: 'vocabulary'
}

const MAX_RECENT_MEDIA = 3

// 获取最近媒体记录
export const getRecentMedia = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_MEDIA)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('获取最近媒体记录失败:', error)
    return []
  }
}

// 添加媒体到最近记录
export const addRecentMedia = (mediaItem) => {
  try {
    const recent = getRecentMedia()

    // 移除已存在的相同项
    const filtered = recent.filter(item => {
      if (item.type === 'url' && mediaItem.type === 'url') {
        return item.url !== mediaItem.url
      }
      if (item.type === 'file' && mediaItem.type === 'file') {
        return item.fileName !== mediaItem.fileName
      }
      return true
    })

    // 添加新项到开头
    const newRecent = [
      {
        ...mediaItem,
        timestamp: Date.now()
      },
      ...filtered
    ].slice(0, MAX_RECENT_MEDIA)

    localStorage.setItem(STORAGE_KEYS.RECENT_MEDIA, JSON.stringify(newRecent))
    return newRecent
  } catch (error) {
    console.error('添加最近媒体记录失败:', error)
    return []
  }
}

// 移除最近媒体记录
export const removeRecentMedia = (index) => {
  try {
    const recent = getRecentMedia()
    recent.splice(index, 1)
    localStorage.setItem(STORAGE_KEYS.RECENT_MEDIA, JSON.stringify(recent))
    return recent
  } catch (error) {
    console.error('移除最近媒体记录失败:', error)
    return []
  }
}

// 获取媒体字幕
export const getMediaSubtitles = (mediaKey) => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEDIA_SUBTITLES)
    if (!data) return null
    const subtitles = JSON.parse(data)
    return subtitles[mediaKey] || null
  } catch (error) {
    console.error('获取媒体字幕失败:', error)
    return null
  }
}

// 保存媒体字幕
export const saveMediaSubtitles = (mediaKey, subtitles) => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEDIA_SUBTITLES)
    const allSubtitles = data ? JSON.parse(data) : {}
    allSubtitles[mediaKey] = {
      subtitles,
      timestamp: Date.now()
    }
    localStorage.setItem(STORAGE_KEYS.MEDIA_SUBTITLES, JSON.stringify(allSubtitles))
    return true
  } catch (error) {
    console.error('保存媒体字幕失败:', error)
    return false
  }
}

// 获取生词本（长期保存）
export const getVocabulary = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VOCABULARY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('获取生词本失败:', error)
    return []
  }
}

// 保存生词到生词本（长期保存）
export const saveToVocabulary = (word, definition) => {
  try {
    const vocab = getVocabulary()
    // 检查是否已存在
    const exists = vocab.find(item => item.word.toLowerCase() === word.toLowerCase())
    if (exists) return vocab

    vocab.push({
      word,
      definition,
      timestamp: Date.now()
    })
    localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(vocab))
    return vocab
  } catch (error) {
    console.error('保存生词失败:', error)
    return []
  }
}

// 从生词本移除单词
export const removeFromVocabulary = (word) => {
  try {
    const vocab = getVocabulary()
    const filtered = vocab.filter(item => item.word.toLowerCase() !== word.toLowerCase())
    localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(filtered))
    return filtered
  } catch (error) {
    console.error('移除生词失败:', error)
    return []
  }
}

// 生成媒体唯一键
export const generateMediaKey = (source, type) => {
  if (type === 'url') {
    return `url:${source}`
  }
  if (type === 'file' && source.name) {
    return `file:${source.name}-${source.size}`
  }
  return `other:${Date.now()}`
}
