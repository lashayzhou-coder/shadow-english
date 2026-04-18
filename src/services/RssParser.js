// RSS/播客解析服务
const getContentFromRss = async (url) => {
  try {
    // 使用 CORS 代理或直接获取（取决于 CORS 设置）
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl)
    const data = await response.json()

    if (!data.contents) {
      throw new Error('无法获取 RSS 内容')
    }

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(data.contents, 'text/xml')

    // 尝试查找 <item> 内容
    const items = xmlDoc.querySelectorAll('item')
    if (items.length > 0) {
      const item = items[0] // 使用第一个条目
      const description = item.querySelector('description')?.textContent
      const contentEncoded = item.querySelector('content\\:encoded')?.textContent

      if (contentEncoded) {
        return extractTextFromHtml(contentEncoded)
      }

      if (description) {
        return extractTextFromHtml(description)
      }
    }

    return null
  } catch (error) {
    console.error('RSS 解析错误:', error)
    return null
  }
}

// 从 HTML 中提取纯文本
const extractTextFromHtml = (html) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')  // 移除脚本
    .replace(/<style[\s\S]*?<\/style>/g, '')   // 移除样式
    .replace(/<[^>]+>/g, ' ')                  // 移除所有标签
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 尝试解析播客页面
export const parsePodcastPage = async (url) => {
  // 简单实现：如果是标准播客 URL
  if (url.includes('.rss') || url.includes('rss')) {
    return getContentFromRss(url)
  }

  // 尝试解析常见播客网站
  const domain = new URL(url).hostname
  let transcriptUrl = null

  if (domain.includes('npr.org')) {
    // NPR 播客
    transcriptUrl = await findNprTranscript(url)
  } else if (domain.includes('ted.com')) {
    // TED 演讲
    transcriptUrl = await findTedTranscript(url)
  } else if (domain.includes('radiolab.org')) {
    // Radiolab
    transcriptUrl = await findRadiolabTranscript(url)
  }

  if (transcriptUrl) {
    try {
      const response = await fetch(transcriptUrl)
      const text = await response.text()
      return extractTextFromHtml(text)
    } catch (error) {
      console.error('获取播客转录失败:', error)
    }
  }

  return null
}

// 查找 NPR 播客转录
const findNprTranscript = async (url) => {
  // 简单实现：NPR 通常有固定的转录格式
  if (url.includes('/segments/')) {
    return url + '/transcript'
  }
  return null
}

// 查找 TED 演讲转录
const findTedTranscript = async (url) => {
  // 简单实现：TED 有固定的转录格式
  if (url.match(/\/talks\/[^\/]+$/)) {
    return url + '/transcript'
  }
  return null
}

// 查找 Radiolab 转录
const findRadiolabTranscript = async (url) => {
  // 简单实现：Radiolab 转录链接
  return null // 需要根据实际网站结构实现
}

// 提取音频 URL（用于后续转录）
export const extractAudioUrlFromPage = async (url) => {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // 匹配常见音频格式的链接
    const audioMatches = html.match(/https?:\/\/[^\s"']+\.(mp3|m4a|wav)/g)

    if (audioMatches) {
      // 过滤掉可能的广告或无效链接
      return audioMatches.find(url =>
        !url.includes('ad') &&
        url.includes('audio') &&
        url.length < 200
      )
    }

    return null
  } catch (error) {
    console.error('提取音频链接失败:', error)
    return null
  }
}

// 判断是否是有效的 RSS URL
export const isRssUrl = (url) => {
  return url.includes('.rss') || url.includes('rss')
}

// 判断是否是播客网站
export const isPodcastUrl = (url) => {
  const podcastDomains = ['npr.org', 'ted.com', 'radiolab.org', 'thisamericanlife.org']
  return podcastDomains.some(domain => url.includes(domain))
}

// 主入口函数
export const getTranscriptFromPodcast = async (url) => {
  if (isRssUrl(url)) {
    return getContentFromRss(url)
  } else if (isPodcastUrl(url)) {
    return parsePodcastPage(url)
  } else {
    return null
  }
}
