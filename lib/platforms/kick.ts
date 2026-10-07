import type { LiveStream } from '../types'
import { appTokenProvider, chunk, fetchOk, NotConfiguredError } from './http'

// Official Kick public API: https://docs.kick.com
const API_BASE = 'https://api.kick.com/public/v1'
const REVALIDATE_SECONDS = 60
const DISCOVER_LANGUAGE = 'es'
const DISCOVER_CATEGORY_QUERIES = ['Software', 'Science']
const DISCOVER_CATEGORY_NAMES = new Set([
  'software development',
  'science & technology',
  'science and technology',
])

type KickCategory = { id: number; name: string }

export type KickChannel = {
  slug: string
  stream_title?: string
  category?: KickCategory | null
  stream?: {
    is_live: boolean
    viewer_count?: number
    start_time?: string
    thumbnail?: string
  } | null
}

export type KickLivestream = {
  slug: string
  stream_title?: string
  category?: KickCategory | null
  viewer_count?: number
  started_at?: string
  thumbnail?: string
}

function streamFromKick(fields: {
  slug: string
  title?: string
  category?: KickCategory | null
  viewers?: number
  startedAt?: string
  thumbnail?: string
}): LiveStream {
  return {
    platform: 'kick',
    channelKey: fields.slug.toLowerCase(),
    channelName: fields.slug,
    title: fields.title ?? '',
    category: fields.category?.name ?? null,
    viewers: fields.viewers ?? null,
    startedAt: fields.startedAt ?? null,
    thumbnail: fields.thumbnail || null,
    url: `https://kick.com/${fields.slug}`,
  }
}

export function mapKickChannel(channel: KickChannel): LiveStream | null {
  if (!channel.stream?.is_live) return null
  return streamFromKick({
    slug: channel.slug,
    title: channel.stream_title,
    category: channel.category,
    viewers: channel.stream.viewer_count,
    startedAt: channel.stream.start_time,
    thumbnail: channel.stream.thumbnail,
  })
}

export function mapKickLivestream(livestream: KickLivestream): LiveStream {
  return streamFromKick({
    slug: livestream.slug,
    title: livestream.stream_title,
    category: livestream.category,
    viewers: livestream.viewer_count,
    startedAt: livestream.started_at,
    thumbnail: livestream.thumbnail,
  })
}

function credentials() {
  const clientId = process.env.KICK_CLIENT_ID
  const clientSecret = process.env.KICK_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new NotConfiguredError('Kick credentials missing')
  return { clientId, clientSecret }
}

const getToken = appTokenProvider(async () => {
  const { clientId, clientSecret } = credentials()
  const response = await fetchOk('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })
  return response.json()
})

async function kickApi<T>(path: string, params: [string, string][]): Promise<T[]> {
  credentials()
  const token = await getToken()
  const response = await fetchOk(`${API_BASE}/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
    revalidate: REVALIDATE_SECONDS,
  })
  const payload: { data: T[] | null } = await response.json()
  return payload.data ?? []
}

export async function getKickLive(slugs: string[]): Promise<LiveStream[]> {
  if (!slugs.length) return []
  const batches = await Promise.all(
    chunk(slugs, 50).map((batch) =>
      kickApi<KickChannel>(
        'channels',
        batch.map((slug): [string, string] => ['slug', slug]),
      ),
    ),
  )
  return batches
    .flat()
    .map(mapKickChannel)
    .filter((stream): stream is LiveStream => stream !== null)
}

async function discoverCategoryIds(): Promise<number[]> {
  const results = await Promise.all(
    DISCOVER_CATEGORY_QUERIES.map((query) => kickApi<KickCategory>('categories', [['q', query]])),
  )
  const ids = results
    .flat()
    .filter((category) => DISCOVER_CATEGORY_NAMES.has(category.name.toLowerCase()))
    .map((category) => category.id)
  return [...new Set(ids)]
}

export async function getKickDiscover(): Promise<LiveStream[]> {
  const categoryIds = await discoverCategoryIds()
  const results = await Promise.all(
    categoryIds.map((id) =>
      kickApi<KickLivestream>('livestreams', [
        ['category_id', String(id)],
        ['language', DISCOVER_LANGUAGE],
        ['limit', '50'],
        ['sort', 'viewer_count'],
      ]),
    ),
  )
  return results.flat().map(mapKickLivestream)
}
