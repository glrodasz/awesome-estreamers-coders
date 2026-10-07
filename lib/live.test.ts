import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveSnapshot, mixDiscover } from './live'
import type { LiveStream, Platform } from './types'

const stream = (login: string, viewers: number) => ({
  user_login: login,
  user_name: login,
  game_name: 'Software and Game Development',
  title: `${login} en vivo`,
  viewer_count: viewers,
  started_at: '2026-10-06T18:00:00Z',
  thumbnail_url: '',
})

function twitchOnlyFetch(url: string) {
  const { hostname, pathname, searchParams } = new URL(url)
  if (hostname === 'id.twitch.tv') return Response.json({ access_token: 't', expires_in: 3600 })
  if (pathname === '/helix/games') return Response.json({ data: [{ id: '1469308723' }] })
  if (pathname === '/helix/streams' && searchParams.has('user_login')) {
    return Response.json({ data: [stream('midudev', 10), stream('mouredev', 300)] })
  }
  if (pathname === '/helix/streams') {
    return Response.json({ data: [stream('midudev', 10), stream('nuevo_coder', 50)] })
  }
  return new Response('unexpected', { status: 500 })
}

describe('getLiveSnapshot', () => {
  beforeEach(() => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'secret')
    vi.stubEnv('YOUTUBE_API_KEY', '')
    vi.stubEnv('KICK_CLIENT_ID', '')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => twitchOnlyFetch(url)))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('matches curated streamers, excludes them from discover and reports missing platforms', async () => {
    const snapshot = await getLiveSnapshot()

    expect(snapshot.live.map((s) => [s.channelKey, s.streamerNames])).toEqual([
      ['mouredev', ['Brais Moure']],
      ['midudev', ['Miguel Ángel Durán']],
    ])
    expect(snapshot.discover.map((s) => s.channelKey)).toEqual(['nuevo_coder'])
    expect(snapshot.issues).toEqual([
      { platform: 'kick', reason: 'not-configured' },
      { platform: 'youtube', reason: 'not-configured' },
    ])
  })

  it('keeps the page working when a platform errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))

    const snapshot = await getLiveSnapshot()

    expect(snapshot.live).toEqual([])
    expect(snapshot.issues).toContainEqual({ platform: 'twitch', reason: 'error' })
  })
})

describe('mixDiscover', () => {
  const streamsOf = (platform: Platform, count: number): LiveStream[] =>
    Array.from({ length: count }, (_, i) => ({
      platform,
      channelKey: `${platform}${i}`,
      channelName: `${platform}${i}`,
      title: '',
      category: null,
      viewers: (platform === 'twitch' ? 1000 : 10) - i,
      startedAt: null,
      thumbnail: null,
      url: `https://example.com/${platform}${i}`,
    }))
  const platformCounts = (streams: LiveStream[]) =>
    streams.reduce<Record<string, number>>((counts, s) => ({ ...counts, [s.platform]: (counts[s.platform] ?? 0) + 1 }), {})

  it('shows 3 Twitch, 2 Kick and 1 YouTube when all are available', () => {
    const mixed = mixDiscover([...streamsOf('twitch', 10), ...streamsOf('kick', 5), ...streamsOf('youtube', 5)])
    expect(platformCounts(mixed)).toEqual({ twitch: 3, kick: 2, youtube: 1 })
  })

  it('gives the YouTube slot to Kick when there is no YouTube', () => {
    const mixed = mixDiscover([...streamsOf('twitch', 10), ...streamsOf('kick', 5)])
    expect(platformCounts(mixed)).toEqual({ twitch: 3, kick: 3 })
  })

  it('fills with Twitch when there is no Kick or YouTube', () => {
    expect(platformCounts(mixDiscover(streamsOf('twitch', 10)))).toEqual({ twitch: 6 })
    expect(platformCounts(mixDiscover([...streamsOf('twitch', 10), ...streamsOf('kick', 1)]))).toEqual({
      twitch: 5,
      kick: 1,
    })
  })

  it('keeps the top streams per platform, sorted by viewers', () => {
    const mixed = mixDiscover([...streamsOf('kick', 3), ...streamsOf('twitch', 4)].reverse())
    expect(mixed.map((s) => s.channelKey)).toEqual(['twitch0', 'twitch1', 'twitch2', 'kick0', 'kick1', 'kick2'])
  })

  it('shows a simulcast channel once, on the platform with more viewers', () => {
    const simulcast = (platform: Platform, viewers: number) =>
      streamsOf(platform, 1).map((s) => ({ ...s, channelKey: 'pashoai', viewers }))

    const kickWins = mixDiscover([...streamsOf('twitch', 10), ...simulcast('twitch', 2), ...simulcast('kick', 3)])
    expect(kickWins.filter((s) => s.channelKey === 'pashoai').map((s) => s.platform)).toEqual(['kick'])

    const twitchWins = mixDiscover([...streamsOf('twitch', 2), ...simulcast('twitch', 3), ...simulcast('kick', 2)])
    expect(twitchWins.filter((s) => s.channelKey === 'pashoai').map((s) => s.platform)).toEqual(['twitch'])
  })
})
