import { useState, useRef, useEffect, useCallback } from 'react'
import { getRecentMedia, addRecentMedia, removeRecentMedia, generateMediaKey } from '../../services/storageService'
import './AudioPlayer.css'

const AudioPlayer = ({
  onTimeUpdate,
  onDurationChange,
  onMediaSourceChange
}) => {
  // 音频/视频状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [mediaSource, setMediaSource] = useState('')
  const [sourceType, setSourceType] = useState('url') // 'url' or 'file'
  const [isVideo, setIsVideo] = useState(false) // 是否是视频文件
  const [isYouTube, setIsYouTube] = useState(false) // 是否是 YouTube 视频
  const [youtubeVideoId, setYoutubeVideoId] = useState('') // YouTube 视频 ID

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
  const youtubePlayerRef = useRef(null) // YouTube iframe 引用
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)
  const fileObjectUrlRef = useRef(null) // 保存对象 URL 用于清理
  const intervalRef = useRef(null) // 用于 YouTube 进度更新的间隔

  // 清理旧的对象 URL（防止内存泄漏）
  const cleanupObjectUrl = useCallback(() => {
    if (fileObjectUrlRef.current) {
      URL.revokeObjectURL(fileObjectUrlRef.current)
      fileObjectUrlRef.current = null
    }
  }, [])

  // 最近加载记录
  const [recentMedia, setRecentMedia] = useState([])

  // 初始化时获取最近记录
  useEffect(() => {
    const recent = getRecentMedia()
    setRecentMedia(recent)
  }, [])

  // 判断是否是 YouTube 链接
  const isYouTubeUrl = useCallback((url) => {
    return url && (
      url.includes('youtube.com') ||
      url.includes('youtu.be')
    )
  }, [])

  // 提取 YouTube 视频 ID
  const extractYouTubeVideoId = useCallback((url) => {
    if (!url) return null

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?\/]+)/,
      /youtube\.com\/shorts\/([^&\s?\/]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }, [])

  // 从 URL 中提取标题
  const extractUrlTitle = useCallback((url) => {
    if (isYouTubeUrl(url)) {
      const videoId = extractYouTubeVideoId(url)
      return `YouTube 视频 (${videoId})`
    }
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      return pathParts[pathParts.length - 1] || urlObj.hostname
    } catch {
      return url
    }
  }, [isYouTubeUrl, extractYouTubeVideoId])

  // 判断是否是视频文件
  const isVideoFile = useCallback((url) => {
    if (!url) return false
    if (isYouTubeUrl(url)) return true

    return (
      url.includes('.mp4') ||
      url.includes('.webm') ||
      url.includes('.ogg') ||
      url.includes('.avi') ||
      url.includes('.mov')
    )
  }, [isYouTubeUrl])

  // 加载媒体 URL（支持音频、视频和 YouTube）
  const loadMediaUrl = useCallback((mediaUrl) => {
    const urlToLoad = mediaUrl || urlInput
    if (!urlToLoad.trim()) {
      setError('请输入音频/视频链接')
      return
    }

    // 保存到最近记录
    const mediaItem = {
      type: 'url',
      url: urlToLoad.trim(),
      title: extractUrlTitle(urlToLoad.trim()),
      timestamp: Date.now()
    }
    const newRecent = addRecentMedia(mediaItem)
    setRecentMedia(newRecent)

    // 清理旧的资源
    cleanupObjectUrl()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

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

    // 判断是否是 YouTube
    const youtube = isYouTubeUrl(urlToLoad)
    const videoId = youtube ? extractYouTubeVideoId(urlToLoad) : null

    if (youtube && !videoId) {
      setError('无法识别 YouTube 视频链接，请检查链接格式')
      setIsLoading(false)
      return
    }

    setIsYouTube(youtube)
    setYoutubeVideoId(videoId)

    // 判断是否是视频（非 YouTube）
    const video = isVideoFile(urlInput) && !youtube
    setIsVideo(video)

    // YouTube 处理
    if (youtube && videoId) {
      // YouTube 不需要预加载，直接显示嵌入播放器
      setIsLoading(false)
      const source = urlToLoad.trim()
      setMediaSource(source)
      setSourceType('url')
      if (onMediaSourceChange) {
        onMediaSourceChange(source, 'url')
      }
      // 设置一个假的 duration（会通过 YouTube API 实时获取）
      setDuration(9999)
      return
    }

    // 直接修改 src 属性，保持元素存在
    const source = urlToLoad.trim()
    if (video && videoRef.current) {
      videoRef.current.src = source
      videoRef.current.preload = 'metadata' // 视频使用 metadata 预加载
    } else if (!video && audioRef.current) {
      audioRef.current.src = source
      audioRef.current.preload = 'auto' // 音频使用 auto 预加载
    }

    setMediaSource(source)
    setSourceType('url')
    if (onMediaSourceChange) {
      onMediaSourceChange(source, 'url')
    }
  }, [urlInput, cleanupObjectUrl, isYouTubeUrl, extractYouTubeVideoId, isVideoFile, extractUrlTitle])

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

      // 保存到最近记录
      const mediaItem = {
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        title: file.name,
        timestamp: Date.now()
      }
      const newRecent = addRecentMedia(mediaItem)
      setRecentMedia(newRecent)

      // 清理旧的资源
      cleanupObjectUrl()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

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
      setIsYouTube(false)

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
      if (onMediaSourceChange) {
        onMediaSourceChange(file, 'file')
      }
    }
  }, [cleanupObjectUrl])

  // 重新加载最近记录的媒体
  const reloadRecentMedia = useCallback((item, index) => {
    if (item.type === 'url') {
      setUrlInput(item.url)
      loadMediaUrl(item.url)
    } else if (item.type === 'file') {
      // 文件类型需要重新上传，这里只显示提示
      setError('文件类型的记录无法直接重新加载，请重新选择文件')
    }
  }, [loadMediaUrl])

  // 从最近记录中移除
  const removeFromRecentMedia = useCallback((index) => {
    const newRecent = removeRecentMedia(index)
    setRecentMedia(newRecent)
  }, [])

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

  // 清理 YouTube 间隔
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // 清理资源（组件卸载时）
  useEffect(() => {
    return () => {
      cleanupObjectUrl()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [cleanupObjectUrl])

  // 媒体加载效果（保持元素持续存在）
  useEffect(() => {
    if (isYouTube) return // YouTube 使用 iframe，不需要这些监听

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    // 监听元数据加载（获取时长）
    const handleLoadedMetadata = () => {
      const newDuration = mediaRef.duration
      setDuration(newDuration)
      if (onDurationChange) {
        onDurationChange(newDuration)
      }
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
      const newTime = mediaRef.currentTime
      setCurrentTime(newTime)
      if (onTimeUpdate) {
        onTimeUpdate(newTime)
      }

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
  }, [isVideo, isYouTube, isRepeating, aPoint, bPoint, duration])

  // 播放/暂停（支持 YouTube）
  const togglePlayPause = useCallback(() => {
    if (isYouTube) {
      // YouTube 使用 iframe 通信
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        if (isPlaying) {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
        } else {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
        }
      }
      setIsPlaying(!isPlaying)
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    if (isPlaying) {
      mediaRef.pause()
    } else {
      mediaRef.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, isVideo, isYouTube])

  // 停止（支持 YouTube）
  const handleStop = useCallback(() => {
    if (isYouTube) {
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
      }
      setIsPlaying(false)
      setCurrentTime(0)
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return

    mediaRef.pause()
    mediaRef.currentTime = 0
    setCurrentTime(0)
    setIsPlaying(false)
  }, [isVideo, isYouTube])

  // 快进/快退（支持 YouTube）
  const jumpForward = useCallback(() => {
    if (isYouTube) {
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${currentTime + 5},true]}`, '*')
      }
      setCurrentTime(currentTime + 5)
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    mediaRef.currentTime = Math.min(
      mediaRef.currentTime + 5,
      duration
    )
  }, [isVideo, isYouTube, currentTime, duration])

  const jumpBackward = useCallback(() => {
    if (isYouTube) {
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${Math.max(currentTime - 5, 0)},true]}`, '*')
      }
      setCurrentTime(Math.max(currentTime - 5, 0))
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    mediaRef.currentTime = Math.max(mediaRef.currentTime - 5, 0)
  }, [isVideo, isYouTube, currentTime])

  // 进度条拖拽（支持 YouTube）
  const handleProgressChange = useCallback((e) => {
    const newTime = parseFloat(e.target.value)

    if (isYouTube) {
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${newTime},true]}`, '*')
      }
      setCurrentTime(newTime)
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (!mediaRef) return
    mediaRef.currentTime = newTime
    setCurrentTime(newTime)
  }, [isVideo, isYouTube])

  // 音量控制（支持 YouTube）
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)

    if (isYouTube) {
      const iframe = youtubePlayerRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${newVolume * 100}]}`, '*')
      }
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (mediaRef) {
      mediaRef.volume = newVolume
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume
    }
  }, [isVideo, isYouTube])

  // 变速播放（不支持 YouTube）
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackRate(speed)

    if (isYouTube) {
      // YouTube 不支持通过 iframe API 改变播放速度
      setError('YouTube 视频暂不支持变速播放')
      setTimeout(() => setError(null), 3000)
      return
    }

    const mediaRef = isVideo ? videoRef.current : audioRef.current
    if (mediaRef) {
      mediaRef.playbackRate = speed
    }
  }, [isVideo, isYouTube])

  // AB 复读设置（支持 YouTube）
  const handleSetAPoint = useCallback(() => {
    setAPoint(currentTime)
    setIsRepeating(false)
  }, [currentTime])

  const handleSetBPoint = useCallback(() => {
    setBPoint(currentTime)
    setIsRepeating(true)
  }, [currentTime])

  const handleClearAB = useCallback(() => {
    setAPoint(null)
    setBPoint(null)
    setIsRepeating(false)
  }, [])

  // AB 复读处理（YouTube 需要特殊处理）
  useEffect(() => {
    if (!isRepeating || aPoint === null || bPoint === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    if (isYouTube) {
      // YouTube 使用间隔检查
      intervalRef.current = setInterval(() => {
        if (currentTime >= bPoint) {
          const iframe = youtubePlayerRef.current
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${aPoint},true]}`, '*')
          }
          setCurrentTime(aPoint)
        }
      }, 100)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRepeating, aPoint, bPoint, currentTime, isYouTube])

  // URL 输入处理（回车加载）
  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      loadMediaUrl()
    }
  }, [loadMediaUrl])

  // 格式化时间
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
              placeholder="请输入音频/视频/YouTube URL，按回车加载"
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

        {/* 最近加载记录 */}
        {recentMedia.length > 0 && (
          <div className="recent-media-section mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📜 最近加载
              </h4>
              <span className="text-xs text-gray-500">点击重新加载</span>
            </div>
            <div className="flex flex-col gap-2">
              {recentMedia.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => reloadRecentMedia(item, index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title || (item.type === 'file' ? item.fileName : item.url)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {item.type === 'url' ? 'URL' : '文件'}
                      </span>
                      {item.type === 'file' && item.fileSize && (
                        <span>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromRecentMedia(index)
                    }}
                    className="ml-2 px-2 py-1 text-xs text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    aria-label="删除记录"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 加载进度 */}
        {isLoading && loadProgress > 0 && !isYouTube && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded-md mb-4">
            加载中... {loadProgress}%（已缓冲可播放）
          </div>
        )}

        {/* YouTube 提示 */}
        {isYouTube && (
          <div className="bg-purple-100 border border-purple-400 text-purple-700 px-4 py-2 rounded-md mb-4">
            YouTube 视频已加载！使用下方控制按钮进行播放。
            <br />
            <small>注意：变速播放功能不支持 YouTube 视频。</small>
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
        className={isVideo || isYouTube ? 'hidden' : 'block'}
        crossOrigin="anonymous" // 启用跨域支持，以便获取更多元数据
      />

      <video
        ref={videoRef}
        preload="metadata"
        volume={volume}
        className={`w-full rounded-lg shadow-md ${isVideo && !isYouTube ? 'block' : 'hidden'}`}
        controls={false} // 隐藏默认控制
        crossOrigin="anonymous"
        playsInline // 允许在 iOS 上内联播放
      />

      {/* YouTube 嵌入播放器 */}
      {mediaSource && isYouTube && youtubeVideoId && (
        <div className="video-container bg-black rounded-lg overflow-hidden mb-4 shadow-lg">
          <iframe
            ref={youtubePlayerRef}
            src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
            className="w-full aspect-video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          />
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
            <span>{isYouTube ? 'YouTube' : formatTime(duration)}</span>
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
              disabled={isLoading}
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
                      : isYouTube
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                  disabled={isYouTube}
                >
                  {speed}x
                </button>
              ))}
            </div>
            {isYouTube && (
              <p className="text-sm text-gray-500 mt-1">YouTube 暂不支持变速播放</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default AudioPlayer
