import { describe, expect, it } from 'vitest'
import { lastLiveDate, latestLiveStart, parseFeedVideoIds } from './activity.mjs'

describe('lastLiveDate', () => {
  it('returns null without a verified live stream', () => {
    expect(lastLiveDate(undefined)).toBeNull()
    expect(lastLiveDate({ youtube: { lastUpload: '2026-10-01T00:00:00Z' }, twitch: { lastVideo: '2026-10-02T00:00:00Z' } })).toBeNull()
  })

  it('takes the most recent live across Twitch and YouTube', () => {
    expect(lastLiveDate({ twitch: { lastLive: '2026-09-01T00:00:00Z' } })).toBe('2026-09-01T00:00:00Z')
    expect(lastLiveDate({ youtube: { lastLive: '2026-08-01T00:00:00+00:00' } })).toBe('2026-08-01T00:00:00+00:00')
    expect(
      lastLiveDate({
        twitch: { lastLive: '2026-09-01T00:00:00Z', lastVideo: '2026-10-05T00:00:00Z' },
        youtube: { lastLive: '2026-09-20T00:00:00Z', lastUpload: '2026-10-06T00:00:00Z' },
      }),
    ).toBe('2026-09-20T00:00:00Z')
  })
})

describe('latestLiveStart', () => {
  it('ignores regular uploads and streams that never started', () => {
    expect(
      latestLiveStart([
        {},
        { liveStreamingDetails: { actualStartTime: '2026-09-01T18:00:00Z' } },
        { liveStreamingDetails: {} },
        { liveStreamingDetails: { actualStartTime: '2026-09-15T18:00:00Z' } },
      ]),
    ).toBe('2026-09-15T18:00:00Z')
    expect(latestLiveStart([{}, { liveStreamingDetails: {} }])).toBeNull()
  })
})

describe('parseFeedVideoIds', () => {
  const xml = ['a1', 'b-2', 'c_3'].map((id) => `<entry><yt:videoId>${id}</yt:videoId></entry>`).join('')

  it('returns every video id by default and honours a limit', () => {
    expect(parseFeedVideoIds(xml)).toEqual(['a1', 'b-2', 'c_3'])
    expect(parseFeedVideoIds(xml, 2)).toEqual(['a1', 'b-2'])
  })
})
