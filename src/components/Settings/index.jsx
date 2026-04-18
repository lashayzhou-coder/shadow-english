import { useState, useEffect, useCallback } from 'react'
import './Settings.css'
import { setGeminiApiKey, getGeminiApiKey, hasGeminiApiKey } from '../../services/GeminiApi'

const Settings = () => {
  const [geminiApiKey, setGeminiApiKeyState] = useState('')
  const [autoGenerateTranscript, setAutoGenerateTranscript] = useState(false)
  const [autoTranslate, setAutoTranslate] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // 加载设置
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyDAuZjMzw0OP7GMKQqsK6-NWjeohi-ohFU'
    const savedAutoTranscript = localStorage.getItem('auto_generate_transcript') === 'true'
    const savedAutoTranslate = localStorage.getItem('auto_translate') === 'true'

    setGeminiApiKeyState(savedGeminiKey)
    setAutoGenerateTranscript(savedAutoTranscript)
    setAutoTranslate(savedAutoTranslate)
  }, [])

  // 保存设置
  const saveSettings = useCallback(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey)
    localStorage.setItem('auto_generate_transcript', autoGenerateTranscript)
    localStorage.setItem('auto_translate', autoTranslate)

    if (geminiApiKey) {
      setGeminiApiKey(geminiApiKey)
    }

    setSaveMessage('设置已保存！')
    setTimeout(() => setSaveMessage(''), 3000)
  }, [geminiApiKey, autoGenerateTranscript, autoTranslate])

  // 重置设置
  const resetSettings = useCallback(() => {
    if (confirm('确定要重置所有设置吗？')) {
      setGeminiApiKeyState('AIzaSyDAuZjMzw0OP7GMKQqsK6-NWjeohi-ohFU')
      setAutoGenerateTranscript(false)
      setAutoTranslate(false)
      localStorage.removeItem('gemini_api_key')
      localStorage.removeItem('auto_generate_transcript')
      localStorage.removeItem('auto_translate')
      setSaveMessage('设置已重置！')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }, [])

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h3 className="settings-section-title">🔑 API 设置</h3>
        <div className="setting-item">
          <label className="setting-label">
            Gemini API Key
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKeyState(e.target.value)}
            placeholder="请输入您的 Gemini API Key"
            className="setting-input"
          />
          <p className="setting-hint">
            用于翻译和音频转录功能。获取 API Key：
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="hint-link"
            >
              aistudio.google.com/app/apikey
            </a>
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">⚙️ 自动功能</h3>

        <div className="setting-item">
          <label className="setting-checkbox-label">
            <input
              type="checkbox"
              checked={autoGenerateTranscript}
              onChange={(e) => setAutoGenerateTranscript(e.target.checked)}
              className="setting-checkbox"
            />
            <span className="checkbox-text">
              加载音频/视频后自动生成英文文本
            </span>
          </label>
          <p className="setting-hint">
            使用 Whisper API 自动转录音频为文本（需要 API Key）
          </p>
        </div>

        <div className="setting-item">
          <label className="setting-checkbox-label">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="setting-checkbox"
            />
            <span className="checkbox-text">
              自动生成中英对照翻译
            </span>
          </label>
          <p className="setting-hint">
            生成文本后自动翻译为中文（需要先启用自动生成文本）
          </p>
        </div>
      </div>

      <div className="settings-actions">
        <button
          onClick={saveSettings}
          className="btn btn-primary"
        >
          保存设置
        </button>
        <button
          onClick={resetSettings}
          className="btn btn-secondary"
        >
          重置设置
        </button>
      </div>

      {saveMessage && (
        <div className="save-message">
          {saveMessage}
        </div>
      )}
    </div>
  )
}

export default Settings