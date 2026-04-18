import './WordTooltip.css'

const WordTooltip = ({ word, definition, isLoading, position, onClose }) => {
  // 如果没有单词或定义，不显示
  if (!word || (!definition && !isLoading)) {
    return null
  }

  return (
    <div
      className="word-tooltip"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`
      }}
    >
      {/* 加载状态 */}
      {isLoading && (
        <div className="tooltip-loading">
          <div className="loading-spinner">⟳</div>
          <div className="loading-text">加载释义...</div>
        </div>
      )}

      {/* 单词信息 */}
      {definition && !isLoading && (
        <div className="tooltip-content">
          {/* 单词和音标 */}
          <div className="word-header">
            <div className="word">{definition.word}</div>
            {definition.phonetic && (
              <div className="phonetic">{definition.phonetic}</div>
            )}
          </div>

          {/* 中文翻译 */}
          {definition.translation && (
            <div className="word-translation">
              {definition.translation}
            </div>
          )}

          {/* 释义 */}
          {definition.definitions && definition.definitions.length > 0 && (
            <div className="word-definitions">
              {definition.definitions.slice(0, 2).map((meaning, index) => (
                <div key={index} className="meaning">
                  <div className="part-of-speech">{meaning.partOfSpeech}</div>
                  {meaning.definitions.slice(0, 2).map((def, idx) => (
                    <div key={idx} className="definition">
                      • {def.definition}
                      {def.example && (
                        <div className="example">
                          "{def.example}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="word-actions">
            <button
              onClick={() => {
                // 这里可以添加"加入生词本"功能
                alert(`"${word}" 已加入生词本`)
              }}
              className="action-button"
            >
              添加到生词本
            </button>
            {definition.audioUrl && (
              <button
                onClick={() => {
                  // 播放发音功能
                  const audio = new Audio(definition.audioUrl)
                  audio.play().catch(error => console.error('播放音频失败:', error))
                }}
                className="action-button"
              >
                播放发音
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WordTooltip
