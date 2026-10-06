import { describe, expect, it } from 'vitest'
import { mapKickChannel, mapKickLivestream } from './kick'
import { mapTwitchStream } from './twitch'
import { mapYouTubeVideo, parseFeedVideoIds } from './youtube'

describe('mapTwitchStream', () => {
  it('maps a Helix stream and sizes the thumbnail', () => {
    expect(
      mapTwitchStream({
        user_login: 'MiduDev',
        user_name: 'midudev',
        game_name: 'Software and Game Development',
        title: 'Programando en vivo',
        viewer_count: 1234,
        started_at: '2026-10-06T18:00:00Z',
        thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_midudev-{width}x{height}.jpg',
      }),
    ).toEqual({
      platform: 'twitch',
      channelKey: 'midudev',
      channelName: 'midudev',
      title: 'Programando en vivo',
      category: 'Software and Game Development',
      viewers: 1234,
      startedAt: '2026-10-06T18:00:00Z',
      thumbnail: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_midudev-640x360.jpg',
      url: 'https://www.twitch.tv/MiduDev',
    })
  })
})

describe('YouTube', () => {
  it('reads the most recent video ids from the channel feed', () => {
    const xml = `<feed><entry><yt:videoId>aaa111</yt:videoId></entry><entry><yt:videoId>bbb-22</yt:videoId></entry><entry><yt:videoId>ccc_33</yt:videoId></entry></feed>`
    expect(parseFeedVideoIds(xml, 2)).toEqual(['aaa111', 'bbb-22'])
  })

  it('maps live videos and skips the rest', () => {
    const video = {
      id: 'abc123',
      snippet: {
        channelId: 'UCxyz',
        channelTitle: 'Canal',
        title: 'Directo',
        liveBroadcastContent: 'live' as const,
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/abc123/mqdefault_live.jpg' } },
      },
      liveStreamingDetails: { actualStartTime: '2026-10-06T18:00:00Z', concurrentViewers: '87' },
    }
    expect(mapYouTubeVideo(video)).toMatchObject({
      platform: 'youtube',
      channelKey: 'ucxyz',
      viewers: 87,
      thumbnail: 'https://i.ytimg.com/vi/abc123/mqdefault_live.jpg',
      url: 'https://www.youtube.com/watch?v=abc123',
    })
    expect(mapYouTubeVideo({ ...video, snippet: { ...video.snippet, liveBroadcastContent: 'none' } })).toBeNull()
  })
})

describe('Kick', () => {
  it('maps live channels and skips offline ones', () => {
    const channel = {
      slug: 'coder',
      stream_title: 'Rust desde cero',
      category: { id: 1, name: 'Software Development' },
      stream: { is_live: true, viewer_count: 42, start_time: '2026-10-06T18:00:00Z', thumbnail: 'https://kick.example/thumb.jpg' },
    }
    expect(mapKickChannel(channel)).toMatchObject({
      platform: 'kick',
      channelKey: 'coder',
      title: 'Rust desde cero',
      category: 'Software Development',
      viewers: 42,
      url: 'https://kick.com/coder',
    })
    expect(mapKickChannel({ ...channel, stream: { is_live: false } })).toBeNull()
    expect(mapKickChannel({ slug: 'coder', stream: null })).toBeNull()
  })

  it('maps livestreams from discovery', () => {
    expect(
      mapKickLivestream({ slug: 'Otro', stream_title: 'Go', viewer_count: 5, started_at: '2026-10-06T18:00:00Z' }),
    ).toMatchObject({ channelKey: 'otro', viewers: 5, category: null, thumbnail: null })
  })
})
