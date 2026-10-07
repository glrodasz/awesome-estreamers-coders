export type Platform = 'twitch' | 'youtube' | 'kick'

export const PLATFORM_LABELS: Record<Platform, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  kick: 'Kick',
}

export type LiveStream = {
  platform: Platform
  /** Twitch login, Kick slug or YouTube channel id, lowercased. Used to match curated streamers. */
  channelKey: string
  channelName: string
  title: string
  category: string | null
  viewers: number | null
  startedAt: string | null
  thumbnail: string | null
  url: string
}

export type CuratedLiveStream = LiveStream & { streamerNames: string[] }

export type PlatformIssue = {
  platform: Platform
  reason: 'not-configured' | 'error'
}

export type LiveSnapshot = {
  generatedAt: string
  live: CuratedLiveStream[]
  discover: LiveStream[]
  issues: PlatformIssue[]
}
