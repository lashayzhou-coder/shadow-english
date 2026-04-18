import { useState, useRef, useEffect, useCallback } from 'react'
import './AudioPlayer.css'

const AudioPlayer = () => {
  // 音频状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [audioSource, setAudioSource] = useState('')
  const [sourceType, setSourceType] = useState('url') // 'url' or 'file'

  // AB 复读状态
  const [aPoint, setAPoint] = useState(null)
  const [bPoint, setBPoint] = useState(null)
  const [isRepeating, setIsRepeating] = useState(false)

  // Refs
  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)
  const mediaSourceRef = useRef(null)

  // 音频引擎初始化
  useEffect(() => {
    // 创建 AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    audioContextRef.current = audioContext

    // 创建增益节点
    const gainNode = audioContext.createGain()
    gainNode.gain.value = volume
    gainNodeRef.current = gainNode

    return () => {
      audioContext.close()
    }
  }, [])

  // 音频加载效果
  useEffect(() => {
    if (audioRef.current) {
      // 监听元数据加载
      const handleLoadedMetadata = () => {
        setDuration(audioRef.current.duration)
      }

      // 监听播放结束
      const handleEnded = () => {
        setIsPlaying(false)
      }

      // 监听时间更新
      const handleTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime)

        // 检查是否需要循环 AB 区间
        if (isRepeating && aPoint !== null && bPoint !== null) {
          const current = audioRef.current.currentTime
          if (current >= bPoint) {
            audioRef.current.currentTime = aPoint
          }
        }
      }

      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      audioRef.current.addEventListener('ended', handleEnded)
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate)

      return () => {
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }
  }, [audioRef, isRepeating, aPoint, bPoint])

  // 播放/暂停
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  // 停止
  const handleStop = useCallback(() => {
    if (!audioRef.current) return

    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  // 快进/快退
  const jumpForward = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(
      audioRef.current.currentTime + 5,
      duration
    )
  }, [duration])

  const jumpBackward = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0)
  }, [])

  // 进度条拖拽
  const handleProgressChange = useCallback((e) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [])

  // 音量控制
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)

    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume
    }
  }, [])

  // 变速播放
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackRate(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [])

  // AB 复读设置
  const handleSetAPoint = useCallback(() => {
    if (!audioRef.current) return
    setAPoint(audioRef.current.currentTime)
    setIsRepeating(false)
  }, [])

  const handleSetBPoint = useCallback(() => {
    if (!audioRef.current) return
    setBPoint(audioRef.current.currentTime)
    setIsRepeating(true)
  }, [])

  const handleClearAB = useCallback(() => {
    setAPoint(null)
    setBPoint(null)
    setIsRepeating(false)
  }, [])

  // 音频源处理
  const handleUrlInput = useCallback((e) => {
    setAudioSource(e.target.value)
    setSourceType('url')
  }, [])

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setAudioSource(url)
      setSourceType('file')
    }
  }, [])

  // 格式化时间
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 空格键 - 播放/暂停
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
      }

      // 右方向键 - 快进 5 秒
      if (e.code === 'ArrowRight') {
        jumpForward()
      }

      // 左方向键 - 快退 5 秒
      if (e.code === 'ArrowLeft') {
        jumpBackward()
      }

      // A 键 - 设置 A 点
      if (e.code === 'KeyA') {
        handleSetAPoint()
      }

      // B 键 - 设置 B 点
      if (e.code === 'KeyB') {
        handleSetBPoint()
      }

      // C 键 - 清除 AB 点
      if (e.code === 'KeyC') {
        handleClearAB()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause, jumpForward, jumpBackward,
       handleSetAPoint, handleSetBPoint, handleClearAB])

  return (
    <div className="audio-player">
      {/* 音频源输入 */}
      <div className="audio-source-inputs mb-4">
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={audioSource}
              onChange={handleUrlInput}
              placeholder="请输入音频 URL 或粘贴播客链接"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sourceType === 'file'}
            />
            <button
              onClick={() => setSourceType('url')}
              className={`px-4 py-2 rounded-md ${
                sourceType === 'url'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              URL
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              accept="audio/mp3,audio/mpeg"
              onChange={handleFileInput}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={sourceType === 'url'}
            />
            <button
              onClick={() => setSourceType('file')}
              className={`px-4 py-2 rounded-md ${
                sourceType === 'file'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              本地文件
            </button>
          </div>
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      {audioSource && (
        <audio
          ref={audioRef}
          src={audioSource}
          preload="metadata"
          volume={volume}
          className="hidden"
        />
      )}

      {/* 播放控制 */}
      <div className="player-controls bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md mb-4">
        {/* 进度条 */}
        <div className="relative mb-4">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {aPoint !== null && bPoint !== null && (
              <>
                <div
                  className="ab-highlight"
                  style={{
                    left: `${(aPoint / duration) * 100}%`,
                    width: `${((bPoint - aPoint) / duration) * 100}%`
                  }}
                />
              </>
            )}
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* 时间显示 */}
        <div className="time-display flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* 主要控制按钮 */}
        <div className="main-controls flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handleStop}
            className="btn btn-secondary"
            aria-label="停止"
          >
            停止
          </button>

          <button
            onClick={jumpBackward}
            className="btn btn-secondary"
            aria-label="快退 5 秒"
          >
            ←5秒
          </button>

          <button
            onClick={togglePlayPause}
            className="btn btn-primary w-16 h-16 text-lg"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>

          <button
            onClick={jumpForward}
            className="btn btn-secondary"
            aria-label="快进 5 秒"
          >
            5秒→
          </button>

          {/* AB 复读按钮 */}
          {aPoint === null ? (
            <button
              onClick={handleSetAPoint}
              className="btn btn-secondary"
              aria-label="设置 A 点"
            >
              设置 A
            </button>
          ) : bPoint === null ? (
            <button
              onClick={handleSetBPoint}
              className="btn btn-secondary"
              aria-label="设置 B 点"
            >
              设置 B
            </button>
          ) : (
            <button
              onClick={handleClearAB}
              className="btn btn-secondary"
              aria-label="清除 AB 点"
            >
              清除 AB
            </button>
          )}
        </div>

        {/* AB 点显示 */}
        {aPoint !== null && (
          <div className="ab-display text-sm text-gray-600 dark:text-gray-400 mb-4">
            A: {formatTime(aPoint)}
            {bPoint !== null && ` - B: ${formatTime(bPoint)}`}
          </div>
        )}

        {/* 音量控制 */}
        <div className="volume-control flex items-center gap-2 mb-4">
          <label htmlFor="volume">音量:</label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1"
            aria-label="音量"
          />
          <span className="text-sm w-12">{Math.round(volume * 100)}%</span>
        </div>

        {/* 变速播放 */}
        <div className="speed-control">
          <label>播放速度:</label>
          <div className="flex gap-2 mt-1">
            {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-3 py-1 rounded-md text-sm ${
                  playbackRate === speed
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="keyboard-hints bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
        <p><strong>快捷键：</strong></p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          <li>空格键：播放/暂停</li>
          <li>←/→：快退/快进 5 秒</li>
          <li>A 键：设置 A 点</li>
          <li>B 键：设置 B 点</li>
          <li>C 键：清除 AB 点</li>
        </ul>
      </div>
    </div>
  )
}

export default AudioPlayer
