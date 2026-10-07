import type { LiveStream } from '../types'
import { chunk, fetchOk, NotConfiguredError } from './http'

// videos.list costs 1 quota unit per call (≤50 ids); at 120s this stays far
// below the default 10k units/day.
const REVALIDATE_SECONDS = 120
const RECENT_VIDEOS_PER_CHANNEL = 5

export type YouTubeVideo = {
  id: string
  snippet: {
    channelId: string
    channelTitle: string
    title: string
    liveBroadcastContent: 'live' | 'upcoming' | 'none'
    thumbnails?: Record<string, { url: string } | undefined>
  }
  liveStreamingDetails?: {
    actualStartTime?: string
    concurrentViewers?: string
  }
}

export function parseFeedVideoIds(xml: string, limit = RECENT_VIDEOS_PER_CHANNEL): string[] {
  return [...xml.matchAll(/<yt:videoId>([\w-]+)<\/yt:videoId>/g)]
    .slice(0, limit)
    .map((match) => match[1])
}

export function mapYouTubeVideo(video: YouTubeVideo): LiveStream | null {
  if (video.snippet.liveBroadcastContent !== 'live') return null
  const { thumbnails = {} } = video.snippet
  const viewers = video.liveStreamingDetails?.concurrentViewers

  return {
    platform: 'youtube',
    channelKey: video.snippet.channelId.toLowerCase(),
    channelName: video.snippet.channelTitle,
    title: video.snippet.title,
    category: null,
    viewers: viewers ? Number(viewers) : null,
    startedAt: video.liveStreamingDetails?.actualStartTime ?? null,
    thumbnail: (thumbnails.maxres ?? thumbnails.medium ?? thumbnails.default)?.url ?? null,
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }
}

async function recentVideoIds(channelId: string): Promise<string[] | null> {
  try {
    const response = await fetchOk(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { revalidate: REVALIDATE_SECONDS },
    )
    return parseFeedVideoIds(await response.text())
  } catch (error) {
    console.warn(`[YouTube] Feed failed for ${channelId}: ${(error as Error).message}`)
    return null
  }
}

/**
 * The public RSS feed (free) lists each channel's latest uploads, live streams
 * included; videos.list then tells which of those are live right now.
 */
export async function getYouTubeLive(channelIds: string[]): Promise<LiveStream[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new NotConfiguredError('YouTube API key missing')

  const feeds = await Promise.all(channelIds.map(recentVideoIds))
  if (channelIds.length && feeds.every((feed) => feed === null)) {
    throw new Error('Every YouTube feed request failed')
  }
  const videoIds = feeds.flatMap((feed) => feed ?? [])
  if (!videoIds.length) return []

  const batches = await Promise.all(
    chunk(videoIds, 50).map(async (ids) => {
      const params = new URLSearchParams({
        part: 'snippet,liveStreamingDetails',
        id: ids.join(','),
        maxResults: '50',
        key: apiKey,
      })
      const response = await fetchOk(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
        revalidate: REVALIDATE_SECONDS,
      })
      const payload: { items: YouTubeVideo[] } = await response.json()
      return payload.items
    }),
  )

  return batches
    .flat()
    .map(mapYouTubeVideo)
    .filter((stream): stream is LiveStream => stream !== null)
}
