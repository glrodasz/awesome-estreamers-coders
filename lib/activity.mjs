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
 * Most recent verified live stream (ISO date) from a generated/statuses.json entry.
 * Only Twitch streams/archives and YouTube broadcasts count: uploads and highlights
 * are not proof of a live stream.
 * @param {any} status
 * @returns {string | null}
 */
export function lastLiveDate(status) {
  return mostRecent([status?.twitch?.lastLive, status?.youtube?.lastLive])
}
