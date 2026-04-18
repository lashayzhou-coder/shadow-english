import { useState } from 'react'
import AudioPlayer from './components/AudioPlayer'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('player')

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
          <AudioPlayer />
        </div>
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
        </div>
      </nav>

      {/* Spacer for bottom navigation */}
      <div className="h-16"></div>
    </div>
  )
}

export default App
