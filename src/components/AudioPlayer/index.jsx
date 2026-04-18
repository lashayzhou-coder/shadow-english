import { useState, useRef, useEffect, useCallback } from 'react'
import './AudioPlayer.css'

const AudioPlayer = () => {
  // 音频/视频状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [mediaSource, setMediaSource] = useState('')
  const [sourceType, setSourceType] = useState('url') // 'url' or 'file'
  const [isVideo, setIsVideo] = useState(false) // 是否是视频文件

  // 加载和错误状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [loadProgress, setLoadProgress] = useState(0) // 0-100
  const [loadedBytes, setLoadedBytes] = useState(0) // 已加载字节
  const [totalBytes, setTotalBytes] = useState(0) // 总字节

  // AB 复读状态
  const [aPoint, setAPoint] = useState(null)
  const [bPoint, setBPoint] = useState(null)
  const [isRepeating, setIsRepeating] = useState(false)

  // Refs
  const audioRef = useRef(null)
  const videoRef = useRef(null) // 视频元素引用
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)
  const fileObjectUrlRef = useRef(null) // 保存对象 URL 用于清理

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

  // 媒体加载效果（保持元素持续存在）
  useEffect(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    // 监听元数据加载（获取时长）
    const handleLoadedMetadata = () => {
      setDuration(mediaRef.duration)
    }

    // 监听可以播放（缓冲足够）
    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
    }

    // 监听加载进度
    const handleProgress = () => {
      if (mediaRef && mediaRef.buffered.length > 0) {
        const buffered = mediaRef.buffered
        const loaded = buffered.end(buffered.length - 1)
        const percent = duration > 0 ? (loaded / duration) * 100 : 0
        setLoadProgress(Math.round(percent))
      }
    }

    // 监听加载开始
    const handleLoadStart = () => {
      setIsLoading(true)
      setLoadProgress(0)
      setLoadedBytes(0)
      setTotalBytes(0)
      setError(null)
    }

    // 监听缓冲（waiting 事件）
    const handleWaiting = () => {
      setIsLoading(true)
    }

    // 监听缓冲结束（playing 事件）
    const handlePlaying = () => {
      setIsLoading(false)
    }

    // 监听加载错误
    const handleError = () => {
      setIsLoading(false)
      setError('无法加载媒体文件，请检查链接是否正确或重新上传')
    }

    // 监听播放结束
    const handleEnded = () => {
      setIsPlaying(false)
    }

    // 监听时间更新
    const handleTimeUpdate = () => {
      setCurrentTime(mediaRef.currentTime)

      // 检查是否需要循环 AB 区间
      if (isRepeating && aPoint !== null && bPoint !== null) {
        const current = mediaRef.currentTime
        if (current >= bPoint) {
          mediaRef.currentTime = aPoint
        }
      }
    }

    mediaRef.addEventListener('loadedmetadata', handleLoadedMetadata)
    mediaRef.addEventListener('canplay', handleCanPlay)
    mediaRef.addEventListener('progress', handleProgress)
    mediaRef.addEventListener('loadstart', handleLoadStart)
    mediaRef.addEventListener('waiting', handleWaiting)
    mediaRef.addEventListener('playing', handlePlaying)
    mediaRef.addEventListener('error', handleError)
    mediaRef.addEventListener('ended', handleEnded)
    mediaRef.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      mediaRef.removeEventListener('loadedmetadata', handleLoadedMetadata)
      mediaRef.removeEventListener('canplay', handleCanPlay)
      mediaRef.removeEventListener('progress', handleProgress)
      mediaRef.removeEventListener('loadstart', handleLoadStart)
      mediaRef.removeEventListener('waiting', handleWaiting)
      mediaRef.removeEventListener('playing', handlePlaying)
      mediaRef.removeEventListener('error', handleError)
      mediaRef.removeEventListener('ended', handleEnded)
      mediaRef.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [isVideo, isRepeating, aPoint, bPoint, duration])

  // 清理旧的对象 URL（防止内存泄漏）
  const cleanupObjectUrl = useCallback(() => {
    if (fileObjectUrlRef.current) {
      URL.revokeObjectURL(fileObjectUrlRef.current)
      fileObjectUrlRef.current = null
    }
  }, [])

  // 判断是否是视频文件
  const isVideoFile = useCallback((url) => {
    return url && (
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.ogg') ||
      url.includes('.avi') ||
      url.includes('.mov')
    )
  }, [])

  // 加载媒体 URL（支持音频和视频）
  const loadMediaUrl = useCallback(() => {
    if (!urlInput.trim()) {
      setError('请输入音频/视频链接')
      return
    }

    // 清理旧的资源
    cleanupObjectUrl()

    // 重置状态
    setIsPlaying(false)
    setAPoint(null)
    setBPoint(null)
    setIsRepeating(false)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
    setIsLoading(true)
    setLoadProgress(0)

    // 判断是否是视频
    const video = isVideoFile(urlInput)
    setIsVideo(video)

    // 直接修改 src 属性，保持元素存在
    if (video && videoRef.current) {
      videoRef.current.src = urlInput.trim()
      videoRef.current.preload = 'metadata' // 视频使用 metadata 预加载
    } else if (!video && audioRef.current) {
      audioRef.current.src = urlInput.trim()
      audioRef.current.preload = 'auto' // 音频使用 auto 预加载
    }

    setMediaSource(urlInput.trim())
    setSourceType('url')
  }, [urlInput, cleanupObjectUrl, isVideoFile])

  // 本地文件处理（优化版）
  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // 文件大小检查（大于 50MB 警告）
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        setError(`文件过大（${(file.size / (1024 * 1024)).toFixed(1)}MB），建议使用音频文件或分割文件后再处理`)
        return
      }

      // 清理旧的资源
      cleanupObjectUrl()

      // 重置状态
      setIsPlaying(false)
      setAPoint(null)
      setBPoint(null)
      setIsRepeating(false)
      setCurrentTime(0)
      setDuration(0)
      setError(null)
      setIsLoading(true)
      setLoadProgress(0)
      setSourceType('file')
      setUrlInput('')

      // 判断是否是视频
      const video = file.type.includes('video')
      setIsVideo(video)

      // 创建对象 URL（流式播放优化）
      const objectUrl = URL.createObjectURL(file)
      fileObjectUrlRef.current = objectUrl

      // 直接修改 src 属性
      if (video && videoRef.current) {
        videoRef.current.src = objectUrl
        videoRef.current.preload = 'metadata' // 视频使用 metadata 预加载
      } else if (!video && audioRef.current) {
        audioRef.current.src = objectUrl
        audioRef.current.preload = 'auto' // 音频使用 auto 预加载
      }

      setMediaSource(objectUrl)
    }
  }, [cleanupObjectUrl])

  // 清理资源（组件卸载时）
  useEffect(() => {
    return () => {
      cleanupObjectUrl()
    }
  }, [cleanupObjectUrl])

  // 播放/暂停
  const togglePlayPause = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    if (isPlaying) {
      mediaRef.pause()
    } else {
      mediaRef.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, isVideo])

  // 停止
  const handleStop = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    mediaRef.pause()
    mediaRef.currentTime = 0
    setCurrentTime(0)
    setIsPlaying(false)
  }, [isVideo])

  // 快进/快退
  const jumpForward = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    mediaRef.currentTime = Math.min(
      mediaRef.currentTime + 5,
      duration
    )
  }, [duration, isVideo])

  const jumpBackward = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    mediaRef.currentTime = Math.max(mediaRef.currentTime - 5, 0)
  }, [isVideo])

  // 进度条拖拽
  const handleProgressChange = useCallback((e) => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    const newTime = parseFloat(e.target.value)
    mediaRef.currentTime = newTime
    setCurrentTime(newTime)
  }, [isVideo])

  // 音量控制
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (mediaRef) {
      mediaRef.volume = newVolume
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume
    }
  }, [isVideo])

  // 变速播放
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackRate(speed)
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (mediaRef) {
      mediaRef.playbackRate = speed
    }
  }, [isVideo])

  // AB 复读设置
  const handleSetAPoint = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    setAPoint(mediaRef.currentTime)
    setIsRepeating(false)
  }, [isVideo])

  const handleSetBPoint = useCallback(() => {
    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    setBPoint(mediaRef.currentTime)
    setIsRepeating(true)
  }, [isVideo])

  const handleClearAB = useCallback(() => {
    setAPoint(null)
    setBPoint(null)
    setIsRepeating(false)
  }, [])

  // URL 输入处理（回车加载）
  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      loadMediaUrl()
    }
  }, [loadMediaUrl])

  // 格式化时间
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 避免在输入框中触发快捷键
      if (e.target.tagName === 'INPUT') {
        return
      }

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
      {/* 媒体源输入 */}
      <div className="audio-source-inputs mb-4">
        <div className="flex flex-col gap-2 mb-2">
          {/* URL 输入 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="请输入音频/视频 URL，按回车加载"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              onClick={loadMediaUrl}
              disabled={isLoading || !urlInput.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md
                       hover:bg-indigo-600 disabled:opacity-50
                       flex items-center gap-2 min-h-[44px]"
              aria-label="加载媒体"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  {loadProgress > 0 ? `${loadProgress}%` : '加载中...'}
                </>
              ) : (
                '加载'
              )}
            </button>
          </div>

          {/* 本地文件上传 */}
          <div className="flex gap-2">
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileInput}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600
                       rounded-md focus:outline-none focus:ring-2 focus:ring-primary
                       min-h-[44px]"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* 加载进度 */}
        {isLoading && loadProgress > 0 && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded-md mb-4">
            加载中... {loadProgress}%（已缓冲可播放）
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
      </div>

      {/* 保持媒体元素持续存在 */}
      <audio
        ref={audioRef}
        preload="auto"
        volume={volume}
        className={isVideo ? 'hidden' : 'block'}
        crossOrigin="anonymous" // 启用跨域支持，以便获取更多元数据
      />

      <video
        ref={videoRef}
        preload="metadata"
        volume={volume}
        className={`w-full rounded-lg shadow-md ${isVideo ? 'block' : 'hidden'}`}
        controls={false} // 隐藏默认控制
        crossOrigin="anonymous"
        playsInline // 允许在 iOS 上内联播放
      />

      {/* 视频显示区域（如果是视频） */}
      {mediaSource && isVideo && (
        <div className="video-container bg-black rounded-lg overflow-hidden mb-4 shadow-lg">
          {/* 视频元素已在上方添加，这里显示占位或额外控制 */}
          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black bg-opacity-50">
              <div className="text-white text-2xl">点击播放</div>
            </div>
          )}
        </div>
      )}

      {/* 播放控制 */}
      {mediaSource && (
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
          <div className="main-controls flex items-center justify-center gap-3 mb-4 flex-wrap">
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
              disabled={isLoading || (duration === 0 && !isPlaying)}
            >
              {isLoading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                isPlaying ? '暂停' : '播放'
              )}
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
            <div className="flex gap-2 mt-1 flex-wrap">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 rounded-md text-sm min-w-[44px] min-h-[44px] ${
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
      )}

      {/* 快捷键提示 */}
      <div className="keyboard-hints bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
        <p><strong>快捷键：</strong></p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          <li>空格键：播放/暂停</li>
          <li>←/→：快退/快进 5 秒</li>
          <li>A 键：设置 A 点</li>
          <li>B 键：设置 B 点</li>
          <li>C 键：清除 AB 点</li>
          <li>Enter 键：在输入框中加载音频</li>
        </ul>
      </div>

      {/* 优化建议 */}
      <div className="optimization-hints bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
        <p><strong>🎯 优化提示：</strong></p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>• 对于大视频文件，建议使用较短的片段或音频文件</li>
          <li>• 网络状况不好时，建议下载到本地后再使用</li>
          <li>• 加载过程中会显示缓冲进度，请耐心等待</li>
        </ul>
      </div>
    </div>
  )
}

export default AudioPlayer
