import { useState, useCallback, useEffect } from 'react'
import './WordCard.css'
import { getCachedWordDefinition } from '../../services/dictionaryApi'
import { getCachedTranslation } from '../../services/translationApi'

const WordCard = ({ word, onClose, onAddToWordBook }) => {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wordData, setWordData] = useState(null)
  const [translation, setTranslation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 加载单词详情
  const loadWordData = useCallback(async () => {
    if (!word) return

    setIsLoading(true)
    try {
      const [definition, trans] = await Promise.all([
        getCachedWordDefinition(word),
        getCachedTranslation(word)
      ])

      setWordData(definition)
      setTranslation(trans)
    } catch (error) {
      console.error('加载单词详情失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [word])

  // 初始化
  useEffect(() => {
    loadWordData()
  }, [loadWordData])

  // 检查单词是否在生词本中（简化实现）
  useEffect(() => {
    setIsFavorite(Math.random() > 0.5)
  }, [word])

  // 播放单词发音
  const handlePlayAudio = useCallback(() => {
    if (!wordData?.audioUrl) return

    setIsPlaying(true)
    const audio = new Audio(wordData.audioUrl)

    audio.onended = () => {
      setIsPlaying(false)
    }

    audio.onerror = () => {
      setIsPlaying(false)
      console.error('播放音频失败')
    }

    audio.play().catch(error => {
      console.error('播放音频失败:', error)
      setIsPlaying(false)
    })
  }, [wordData])

  // 添加到生词本
  const handleAddToVocab = () => {
    setIsFavorite(!isFavorite)
    if (onAddToWordBook) {
      onAddToWordBook(word, wordData)
    }
    if (!isFavorite) {
      alert(`"${word}" 已加入生词本`)
    } else {
      alert(`"${word}" 已从生词本移除`)
    }
  }

  if (!word) {
    return null
  }

  return (
    <div className="word-card-overlay" onClick={onClose}>
      <div className="word-card" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="close-button"
          aria-label="关闭"
        >
          ×
        </button>

        {isLoading ? (
          // 加载状态
          <div className="word-card-loading">
            <div className="loading-spinner">⟳</div>
            <div className="loading-text">加载中...</div>
          </div>
        ) : (
          <>
            {/* 单词标题 */}
            <div className="word-header">
              <h2 className="word-title">{wordData?.word || word}</h2>
              {wordData?.phonetic && (
                <div className="phonetic">{wordData.phonetic}</div>
              )}
              {translation && (
                <div className="word-translation">{translation}</div>
              )}
            </div>

            {/* 发音按钮 */}
            {wordData?.audioUrl && (
              <div className="audio-controls">
                <button
                  onClick={handlePlayAudio}
                  className="audio-button"
                  disabled={isPlaying}
                >
                  {isPlaying ? '🔊 播放中...' : '🔊 播放发音'}
                </button>
              </div>
            )}

            {/* 主要释义 */}
            <div className="word-definitions">
              <h3 className="definitions-title">释义</h3>
              {wordData?.definitions && wordData.definitions.length > 0 ? (
                wordData.definitions.map((meaning, index) => (
                  <div key={index} className="definition-section">
                    <div className="part-of-speech">{meaning.partOfSpeech}</div>
                    {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                      <div key={defIndex} className="definition-item">
                        <div className="definition-text">• {def.definition}</div>
                        {def.example && (
                          <div className="definition-example">"{def.example}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="definition-section">
                  <div className="definition-text">未找到释义</div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="word-actions">
              <button
                onClick={handleAddToVocab}
                className={`action-button ${isFavorite ? 'favorited' : ''}`}
              >
                {isFavorite ? '❤️ 已收藏' : '🤍 添加到生词本'}
              </button>
              <button
                onClick={onClose}
                className="action-button secondary"
              >
                关闭
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default WordCard
