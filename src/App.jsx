import { useState, useRef, useEffect, useCallback } from 'react'
import AudioPlayer from './components/AudioPlayer'
import Transcript from './components/Transcript'
import DictationMode from './components/DictationMode'
import WordCard from './components/WordCard'
import Settings from './components/Settings'
import VocabularyList from './components/VocabularyList'
import { getCachedWordDefinition } from './services/dictionaryApi'
import { addRecentMedia, removeRecentMedia, getRecentMedia } from './services/storageService'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('player')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedWord, setSelectedWord] = useState(null)
  const [wordDefinition, setWordDefinition] = useState(null)
  const [mediaSource, setMediaSource] = useState('')
  const [sourceType, setSourceType] = useState('url')
  const [recentMedia, setRecentMedia] = useState([])

  // 监听音频播放器事件的回调
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time)
  }, [])

  const handleDurationChange = useCallback((dur) => {
    setDuration(dur)
  }, [])

  const handleMediaSourceChange = useCallback((source, type) => {
    setMediaSource(source)
    setSourceType(type)
  }, [])

  const handleWordClick = useCallback(async (word) => {
    console.log('点击单词:', word)
    // 使用真实的词典 API 获取单词定义
    const definition = await getCachedWordDefinition(word.toLowerCase())

    setSelectedWord(word)
    setWordDefinition(definition)
  }, [])

  // 加载最近记录
  useEffect(() => {
    const recent = getRecentMedia()
    setRecentMedia(recent)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            ShadowEnglish
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            英语听说影子训练工具
          </p>
        </div>

        {/* Player Section */}
        <div className="mb-8">
          <AudioPlayer
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onMediaSourceChange={handleMediaSourceChange}
            duration={duration}
          />
        </div>

        {/* 字幕组件 - 始终保持显示，切换页面时保持状态 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📄 字幕</h2>
          <Transcript
            currentTime={currentTime}
            duration={duration}
            onWordClick={handleWordClick}
            audioSource={mediaSource}
            sourceType={sourceType}
          />
        </div>

        {/* 快捷键提示 - 根据 activeTab 显示 */}
        {activeTab === 'player' && (
          <div className="keyboard-hints bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 mb-8">
            <p><strong>快捷键：</strong></p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              <li>P 键：播放/暂停</li>
              <li>←/→：快退/快进 5 秒</li>
              <li>A 键：设置 A 点</li>
              <li>B 键：设置 B 点</li>
              <li>C 键：清除 AB 点</li>
              <li>Enter 键：在输入框中加载</li>
            </ul>
          </div>
        )}

        {/* 支持的媒体类型提示 - 根据 activeTab 显示 */}
        {activeTab === 'player' && (
          <div className="optimization-hints bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-8">
            <p><strong>✅ 支持的媒体类型：</strong></p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• YouTube 视频链接（youtube.com, youtu.be）</li>
              <li>• 本地音频文件（MP3, WAV, OGG 等）</li>
              <li>• 本地视频文件（MP4, WebM 等）</li>
              <li>• 网络音频/视频直链</li>
            </ul>
          </div>
        )}

        {/* 其他 Tab 内容 */}
        {activeTab === 'dictation' && (
          <DictationMode />
        )}

        {activeTab === 'shadow' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🎙️ 跟读模式</h2>
            <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400">
                跟读模式即将推出！
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                支持录音和发音评估
              </p>
            </div>
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">📚 生词本</h2>
            <VocabularyList />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">⚙️ 设置</h2>
            <Settings />
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🕒 最近记录</h2>
            {recentMedia.length === 0 ? (
              <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  暂无最近记录
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  加载媒体文件后会自动保存到这里
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMedia.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title || (item.type === 'file' ? item.fileName : item.url)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.type === 'file' ? `${item.fileSize} bytes` : new Date(item.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.type === 'url' ? 'URL' : '本地文件'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (item.type === 'url') {
                          setMediaSource(item.url)
                          setSourceType('url')
                        }
                      }}
                      className="ml-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-600 transition-colors"
                    >
                      重新加载
                    </button>
                    <button
                      onClick={() => {
                        const updated = removeRecentMedia(index)
                        setRecentMedia(updated)
                      }}
                      className="ml-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'player'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="播放器"
          >
            <span className="text-sm">播放器</span>
          </button>
          <button
            onClick={() => setActiveTab('dictation')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'dictation'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="听写"
          >
            <span className="text-sm">听写</span>
          </button>
          <button
            onClick={() => setActiveTab('shadow')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'shadow'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="跟读"
          >
            <span className="text-sm">跟读</span>
          </button>
          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'vocab'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="生词本"
          >
            <span className="text-sm">生词本</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'settings'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="设置"
          >
            <span className="text-sm">设置</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex flex-col items-center justify-center min-w-[60px] h-full ${
              activeTab === 'recent'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="最近记录"
          >
            <span className="text-sm">最近</span>
          </button>
        </div>
      </nav>

      {/* Spacer for bottom navigation */}
      <div className="h-16"></div>

      {/* 单词详情卡片 */}
      {selectedWord && wordDefinition && (
        <WordCard
          word={selectedWord}
          definition={wordDefinition}
          onClose={() => {
            setSelectedWord(null)
            setWordDefinition(null)
          }}
          onAddToWordBook={(word, definition) => {
            // 处理加入生词本
            const vocab = JSON.parse(localStorage.getItem('vocabulary') || '[]')
            if (!vocab.find(item => item.word === word)) {
              vocab.push({
                word,
                definition,
                timestamp: Date.now()
              })
              localStorage.setItem('vocabulary', JSON.stringify(vocab))
            }
          }}
        />
      )}
    </div>
  )
}

export default App
