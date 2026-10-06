import data from '../data.json'
import statuses from '../statuses.json'
import { buildLinks, channelHandle } from './links.mjs'
import type { Platform } from './types'

type RawStreamer = {
  name: string
  description: string
  country: string
  website?: string
  youtube?: string
  twitch?: string
  kick?: string
  twitter?: string
  facebook?: string
  otherLinks?: { label: string; url: string }[]
}

type RawStatus = {
  name: string
  youtube?: { channelId?: string; lastUpload?: string | null }
  twitch?: { lastLive?: string | null; lastVideo?: string | null }
}

export type Streamer = {
  name: string
  description: string
  country: string
  links: { label: string; url: string }[]
  platforms: Platform[]
  twitchLogin: string | null
  kickSlug: string | null
  youtubeChannelId: string | null
  /** Most recent known activity (ISO date) across platforms, from statuses.json. */
  lastActivity: string | null
}

const statusByName = new Map(
  (statuses.entries as RawStatus[]).map((entry) => [entry.name, entry]),
)

function mostRecent(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((date): date is string => Boolean(date))
  if (!valid.length) return null
  return valid.reduce((latest, date) =>
    Date.parse(date) > Date.parse(latest) ? date : latest,
  )
}

function toStreamer(person: RawStreamer): Streamer {
  const status = statusByName.get(person.name)
  const platforms: Platform[] = []
  if (person.twitch) platforms.push('twitch')
  if (person.youtube) platforms.push('youtube')
  if (person.kick) platforms.push('kick')

  return {
    name: person.name,
    description: person.description,
    country: person.country,
    links: buildLinks(person),
    platforms,
    twitchLogin: person.twitch ? channelHandle(person.twitch) : null,
    kickSlug: person.kick ? channelHandle(person.kick) : null,
    youtubeChannelId: status?.youtube?.channelId ?? null,
    lastActivity: mostRecent([
      status?.youtube?.lastUpload,
      status?.twitch?.lastLive,
      status?.twitch?.lastVideo,
    ]),
  }
}

export const streamers: Streamer[] = (data as RawStreamer[]).map(toStreamer)

export const statusesGeneratedAt: string | null = statuses.generatedAt ?? null
