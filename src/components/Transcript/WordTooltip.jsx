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

          {/* 释义 */}
          <div className="word-definition">
            {definition.definition}
          </div>

          {/* 例句 */}
          {definition.examples && definition.examples.length > 0 && (
            <div className="word-examples">
              {definition.examples.slice(0, 2).map((example, index) => (
                <div key={index} className="example">
                  {example}
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
            <button
              onClick={() => {
                // 播放发音功能
                alert(`播放 "${word}" 的发音`)
              }}
              className="action-button"
            >
              播放发音
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WordTooltip
