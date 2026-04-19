import React, { useState, useEffect } from 'react'
import './VocabularyList.css'

const VocabularyList = () => {
  const [vocabulary, setVocabulary] = useState([])

  useEffect(() => {
    // 从 localStorage 加载生词本
    const savedVocab = JSON.parse(localStorage.getItem('vocabulary') || '[]')
    setVocabulary(savedVocab)
  }, [])

  const handleRemoveFromVocabulary = (word) => {
    const updatedVocab = vocabulary.filter(item => item.word !== word)
    setVocabulary(updatedVocab)
    localStorage.setItem('vocabulary', JSON.stringify(updatedVocab))
  }

  const handleClearAll = () => {
    if (window.confirm('确定要清空全部生词吗？')) {
      setVocabulary([])
      localStorage.setItem('vocabulary', '[]')
    }
  }

  if (vocabulary.length === 0) {
    return (
      <div className="vocabulary-empty">
        <div className="empty-icon">📚</div>
        <h3>暂无生词</h3>
        <p>在学习过程中点击「加入生词本 ★」按钮添加单词</p>
      </div>
    )
  }

  return (
    <div className="vocabulary-container">
      <div className="vocabulary-header">
        <h3>生词本 ({vocabulary.length})</h3>
        <button
          onClick={handleClearAll}
          className="btn btn-danger"
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          清空全部
        </button>
      </div>

      <div className="vocabulary-list">
        {vocabulary.map((item, index) => (
          <div key={index} className="vocabulary-item">
            <div className="word-info">
              <div className="word">{item.word}</div>
              {item.definition.phonetic && (
                <div className="phonetic">{item.definition.phonetic}</div>
              )}
              {item.definition.definitions && item.definition.definitions.length > 0 && (
                <div className="definition-preview">
                  {item.definition.definitions.map((meaning, idx) => (
                    <div key={idx} className="meaning-item">
                      <span className="part-of-speech">{meaning.partOfSpeech}:</span>
                      {meaning.definitions.length > 0 && (
                        <span className="definition-text">
                          {meaning.definitions[0].definition}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="word-actions">
              <button
                onClick={() => handleRemoveFromVocabulary(item.word)}
                className="btn btn-secondary"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VocabularyList
