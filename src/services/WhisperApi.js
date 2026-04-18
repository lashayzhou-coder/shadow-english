// Whisper API 服务 - 用于音频转录
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions"

// 获取用户设置的 API Key
const getApiKey = () => {
  return localStorage.getItem('openai_api_key') || ''
}

// 设置 API Key
export const setApiKey = (key) => {
  localStorage.setItem('openai_api_key', key)
}

// 检查是否有 API Key
export const hasApiKey = () => {
  return !!getApiKey()
}

// 调用 Whisper API 进行转录
export const transcribeAudio = async (audioBlob, language = 'en') => {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('请先在设置中配置 OpenAI API Key')
  }

  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'verbose_json')

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '转录失败')
    }

    const data = await response.json()
    return formatWhisperResponse(data)
  } catch (error) {
    console.error('Whisper API error:', error)
    throw error
  }
}

// 格式化 Whisper API 响应
const formatWhisperResponse = (data) => {
  const segments = data.segments || []

  // 转换为带时间戳的句子
  const sentences = segments.map(segment => ({
    text: segment.text.trim(),
    start: segment.start,
    end: segment.end,
    words: segment.words || []
  })).filter(s => s.text.length > 0)

  return {
    text: data.text || '',
    sentences: sentences,
    duration: data.duration || 0
  }
}

// 模拟 Whisper API（用于演示）
export const mockTranscribe = async (duration) => {
  await new Promise(resolve => setTimeout(resolve, 2000))

  const sampleSentences = [
    { text: 'This is the first sentence.', start: 0, end: 3 },
    { text: 'Welcome to our English learning tool.', start: 3, end: 6 },
    { text: 'Shadowing practice helps improve pronunciation.', start: 6, end: 10 },
    { text: 'You can listen and repeat after the speaker.', start: 10, end: 14 },
    { text: 'Try to match the rhythm and intonation.', start: 14, end: 18 },
    { text: 'This will help you speak more naturally.', start: 18, end: 22 },
    { text: 'Keep practicing every day.', start: 22, end: 25 },
    { text: 'You will see great improvement soon.', start: 25, end: 29 }
  ]

  return {
    text: sampleSentences.map(s => s.text).join(' '),
    sentences: sampleSentences,
    duration: duration
  }
}
