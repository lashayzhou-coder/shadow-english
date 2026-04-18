import { useState, useEffect } from 'react'
import './WordCard.css'

const WordCard = ({ word, definition, onClose }) => {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // 组件加载时设置默认状态
  useEffect(() => {
    // 检查单词是否在生词本中（简化实现）
    setIsFavorite(Math.random() > 0.5)
  }, [word])

  // 播放单词发音
  const handlePlayAudio = () => {
    setIsPlaying(true)
    // 模拟音频播放
    setTimeout(() => {
      setIsPlaying(false)
    }, 1000)
  }

  // 添加到生词本
  const handleAddToVocab = () => {
    setIsFavorite(!isFavorite)
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

        {/* 单词标题 */}
        <div className="word-header">
          <h2 className="word-title">{word}</h2>
          {definition.phonetic && (
            <div className="phonetic">{definition.phonetic}</div>
          )}
        </div>

        {/* 发音按钮 */}
        <div className="audio-controls">
          <button
            onClick={handlePlayAudio}
            className="audio-button"
            disabled={isPlaying}
          >
            {isPlaying ? '🔊 播放中...' : '🔊 播放发音'}
          </button>
        </div>

        {/* 主要释义 */}
        <div className="word-definitions">
          <h3 className="definitions-title">释义</h3>
          <div className="definition-section">
            <div className="definition-text">{definition.definition}</div>
          </div>
        </div>

        {/* 词性和多个释义 */}
        {definition.definitions && definition.definitions.length > 0 && (
          <div className="word-definitions">
            <h3 className="definitions-title">详细释义</h3>
            {definition.definitions.map((meaning, index) => (
              <div key={index} className="definition-section">
                <div className="part-of-speech">{meaning.partOfSpeech}</div>
                {meaning.definitions.map((def, defIndex) => (
                  <div key={defIndex} className="definition-item">
                    <div className="definition-text">{def.definition}</div>
                    {def.example && (
                      <div className="definition-example">{def.example}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 例句 */}
        {definition.examples && definition.examples.length > 0 && (
          <div className="word-examples">
            <h3 className="examples-title">例句</h3>
            {definition.examples.map((example, index) => (
              <div key={index} className="example-item">
                <div className="example-text">{example}</div>
              </div>
            ))}
          </div>
        )}

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
      </div>
    </div>
  )
}

export default WordCard
