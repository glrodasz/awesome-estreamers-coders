import { loadStreamers, readGenerated, STATUSES_FILE } from './data.mjs'
import { buildLinks, channelHandle } from './links.mjs'
import type { Platform } from './types'

type RawStatus = {
  youtube?: { channelId?: string; lastUpload?: string | null }
  twitch?: { lastLive?: string | null; lastVideo?: string | null }
}

export type Streamer = {
  name: string
  description: string
  country: string
  /** `type` is the key from streamers.yml (twitch, youtube, website, …). */
  links: { type: string; label: string; url: string }[]
  platforms: Platform[]
  twitchLogin: string | null
  kickSlug: string | null
  youtubeChannelId: string | null
  /** Most recent known activity (ISO date) across platforms, from generated/statuses.json. */
  lastActivity: string | null
}

const PLATFORMS: Platform[] = ['twitch', 'youtube', 'kick']

const statuses = readGenerated(STATUSES_FILE).entries as Record<string, RawStatus>

function mostRecent(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((date): date is string => Boolean(date))
  if (!valid.length) return null
  return valid.reduce((latest, date) =>
    Date.parse(date) > Date.parse(latest) ? date : latest,
  )
}

export const streamers: Streamer[] = loadStreamers().map((person) => {
  const status = statuses[person.name]
  const { twitch, kick } = person.links

  return {
    name: person.name,
    description: person.description,
    country: person.country,
    links: buildLinks(person),
    platforms: PLATFORMS.filter((platform) => person.links[platform]),
    twitchLogin: twitch ? channelHandle(twitch) : null,
    kickSlug: kick ? channelHandle(kick) : null,
    youtubeChannelId: status?.youtube?.channelId ?? null,
    lastActivity: mostRecent([
      status?.youtube?.lastUpload,
      status?.twitch?.lastLive,
      status?.twitch?.lastVideo,
    ]),
  }
})
