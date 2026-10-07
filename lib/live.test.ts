import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLiveSnapshot } from './live'

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
