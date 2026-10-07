import { getKickDiscover, getKickLive } from './platforms/kick'
import { NotConfiguredError } from './platforms/http'
import { getTwitchDiscover, getTwitchLive } from './platforms/twitch'
import { getYouTubeLive } from './platforms/youtube'
import { streamers, type Streamer } from './streamers'
import type { CuratedLiveStream, LiveSnapshot, LiveStream, Platform, PlatformIssue } from './types'

type Source = {
  platform: Platform
  live: () => Promise<LiveStream[]>
  discover?: () => Promise<LiveStream[]>
}

const streamKey = (platform: Platform, channelKey: string) => `${platform}:${channelKey}`

function curatedKeys(list: Streamer[]): Map<string, string[]> {
  const namesByKey = new Map<string, string[]>()
  const add = (platform: Platform, channelKey: string | null, name: string) => {
    if (!channelKey) return
    const key = streamKey(platform, channelKey.toLowerCase())
    namesByKey.set(key, [...(namesByKey.get(key) ?? []), name])
  }
  for (const streamer of list) {
    add('twitch', streamer.twitchLogin, streamer.name)
    add('youtube', streamer.youtubeChannelId, streamer.name)
    add('kick', streamer.kickSlug, streamer.name)
  }
  return namesByKey
}

function uniqueValues(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

const byViewers = (a: LiveStream, b: LiveStream) => (b.viewers ?? -1) - (a.viewers ?? -1)

const DISCOVER_QUOTAS: [Platform, number][] = [
  ['twitch', 3],
  ['kick', 2],
  ['youtube', 1],
]
// Empty slots go to the smaller platforms first so Twitch doesn't crowd them out.
const DISCOVER_BACKFILL: Platform[] = ['kick', 'youtube', 'twitch']

/** Picks a platform mix (3 Twitch, 2 Kick, 1 YouTube), backfilling missing slots from other platforms. */
export function mixDiscover(streams: LiveStream[]): LiveStream[] {
  const remaining = new Map<Platform, LiveStream[]>()
  for (const stream of [...streams].sort(byViewers)) {
    remaining.set(stream.platform, [...(remaining.get(stream.platform) ?? []), stream])
  }
  const take = (platform: Platform, count: number) => remaining.get(platform)?.splice(0, count) ?? []

  const picked = DISCOVER_QUOTAS.flatMap(([platform, count]) => take(platform, count))
  const limit = DISCOVER_QUOTAS.reduce((total, [, count]) => total + count, 0)
  for (const platform of DISCOVER_BACKFILL) {
    picked.push(...take(platform, limit - picked.length))
  }
  return picked.sort(byViewers)
}

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const namesByKey = curatedKeys(streamers)
  const sources: Source[] = [
    {
      platform: 'twitch',
      live: () => getTwitchLive(uniqueValues(streamers.map((s) => s.twitchLogin))),
      discover: getTwitchDiscover,
    },
    {
      platform: 'youtube',
      live: () => getYouTubeLive(uniqueValues(streamers.map((s) => s.youtubeChannelId))),
    },
    {
      platform: 'kick',
      live: () => getKickLive(uniqueValues(streamers.map((s) => s.kickSlug))),
      discover: getKickDiscover,
    },
  ]

  const live: CuratedLiveStream[] = []
  const discover: LiveStream[] = []
  const issues: PlatformIssue[] = []

  await Promise.all(
    sources.map(async (source) => {
      const results = await Promise.allSettled([source.live(), source.discover?.() ?? []])
      const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))
      for (const failure of failures) {
        if (!(failure instanceof NotConfiguredError)) {
          console.error(`[${source.platform}] ${failure instanceof Error ? failure.message : failure}`)
        }
      }
      if (failures.length) {
        const notConfigured = failures.some((failure) => failure instanceof NotConfiguredError)
        issues.push({ platform: source.platform, reason: notConfigured ? 'not-configured' : 'error' })
      }

      const [liveResult, discoverResult] = results
      if (liveResult.status === 'fulfilled') {
        for (const stream of liveResult.value) {
          const streamerNames = namesByKey.get(streamKey(stream.platform, stream.channelKey)) ?? []
          live.push({ ...stream, streamerNames })
        }
      }
      if (discoverResult.status === 'fulfilled') {
        const seen = new Set<string>()
        for (const stream of discoverResult.value) {
          const key = streamKey(stream.platform, stream.channelKey)
          if (namesByKey.has(key) || seen.has(key)) continue
          seen.add(key)
          discover.push(stream)
        }
      }
    }),
  )

  return {
    generatedAt: new Date().toISOString(),
    live: live.sort(byViewers),
    discover: mixDiscover(discover),
    issues: issues.sort((a, b) => a.platform.localeCompare(b.platform)),
  }
}
