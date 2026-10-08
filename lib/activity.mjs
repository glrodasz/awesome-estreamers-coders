/**
 * @typedef {{ actualStartTime?: string }} LiveStreamingDetails
 * @typedef {{ liveStreamingDetails?: LiveStreamingDetails }} YouTubeVideoLike
 */

/**
 * Video ids from a YouTube channel RSS feed, newest first.
 * @param {string} xml
 * @param {number} [limit]
 * @returns {string[]}
 */
export function parseFeedVideoIds(xml, limit = Infinity) {
  return [...xml.matchAll(/<yt:videoId>([\w-]+)<\/yt:videoId>/g)]
    .slice(0, limit)
    .map((match) => match[1])
}

/**
 * @param {(string | null | undefined)[]} dates
 * @returns {string | null}
 */
export function mostRecent(dates) {
  const valid = /** @type {string[]} */ (dates.filter(Boolean))
  if (!valid.length) return null
  return valid.reduce((latest, date) => (Date.parse(date) > Date.parse(latest) ? date : latest))
}

/**
 * Start of the most recent broadcast among videos.list results. Scheduled streams
 * that never started have no actualStartTime and are ignored.
 * @param {YouTubeVideoLike[]} videos
 * @returns {string | null}
 */
export function latestLiveStart(videos) {
  return mostRecent(videos.map((video) => video.liveStreamingDetails?.actualStartTime))
}

/**
 * Latest stream among Twitch videos.list results. Past broadcasts expire after a few
 * weeks, while highlights (cut from a broadcast) stay; uploads are not streams.
 * @param {{ type: string, created_at: string }[]} videos
 * @returns {string | null}
 */
export function twitchLastLive(videos) {
  return mostRecent(
    videos.filter((video) => video.type === 'archive' || video.type === 'highlight').map((video) => video.created_at),
  )
}

/**
 * Latest stream among a Kick channel's past livestreams, whose dates come as
 * "YYYY-MM-DD HH:MM:SS" in UTC.
 * @param {{ start_time?: string, created_at?: string }[]} videos
 * @returns {string | null}
 */
export function kickLastLive(videos) {
  return mostRecent(
    videos.map((video) => {
      const date = video.start_time || video.created_at
      if (!date) return null
      const iso = date.replace(' ', 'T')
      return /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
    }),
  )
}

/**
 * Most recent live stream (ISO date) from a generated/statuses.json entry, across
 * Twitch, Kick and YouTube. Uploads are not proof of a live stream.
 * @param {any} status
 * @returns {string | null}
 */
export function lastLiveDate(status) {
  return mostRecent([status?.twitch?.lastLive, status?.kick?.lastLive, status?.youtube?.lastLive])
}
