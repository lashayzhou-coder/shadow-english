// Gemini API 服务 - 用于翻译和文本处理
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

// 默认的 Gemini API Key（用户提供的）
const DEFAULT_GEMINI_API_KEY = "AIzaSyDAuZjMzw0OP7GMKQqsK6-NWjeohi-ohFU"

// 获取用户设置的 API Key
export const getGeminiApiKey = () => {
  return localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY
}

// 设置 API Key
export const setGeminiApiKey = (key) => {
  localStorage.setItem('gemini_api_key', key)
}

// 检查是否有 API Key
export const hasGeminiApiKey = () => {
  return !!getGeminiApiKey()
}

// 调用 Gemini API 进行翻译
export const translateWithGemini = async (text, from = 'en', to = 'zh-CN') => {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    throw new Error('请先在设置中配置 Gemini API Key')
  }

  try {
    const prompt = `请将以下文本从${from === 'en' ? '英文' : '中文'}翻译成${to === 'zh-CN' ? '中文' : '英文'}，只返回翻译结果：\n\n${text}`

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '翻译失败')
    }

    const data = await response.json()
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!translation) {
      throw new Error('无法获取翻译结果')
    }

    return translation
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

export default {
  getGeminiApiKey,
  setGeminiApiKey,
  hasGeminiApiKey,
  translateWithGemini
}