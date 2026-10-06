import type { LiveStream } from '../types'
import { appTokenProvider, chunk, fetchOk, NotConfiguredError } from './http'

const REVALIDATE_SECONDS = 60
const DISCOVER_LANGUAGE = 'es'
const DISCOVER_CATEGORIES = ['Software and Game Development', 'Science & Technology']

export type TwitchStream = {
  user_login: string
  user_name: string
  game_name: string
  title: string
  viewer_count: number
  started_at: string
  thumbnail_url: string
}

export function mapTwitchStream(stream: TwitchStream): LiveStream {
  return {
    platform: 'twitch',
    channelKey: stream.user_login.toLowerCase(),
    channelName: stream.user_name,
    title: stream.title,
    category: stream.game_name || null,
    viewers: stream.viewer_count,
    startedAt: stream.started_at,
    thumbnail: stream.thumbnail_url
      ? stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360')
      : null,
    url: `https://www.twitch.tv/${stream.user_login}`,
  }
}

function credentials() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new NotConfiguredError('Twitch credentials missing')
  return { clientId, clientSecret }
}

const getToken = appTokenProvider(async () => {
  const { clientId, clientSecret } = credentials()
  const response = await fetchOk('https://id.twitch.tv/oauth2/token', {
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

async function helix<T>(path: string, params: [string, string][]): Promise<T[]> {
  const { clientId } = credentials()
  const token = await getToken()
  const response = await fetchOk(
    `https://api.twitch.tv/helix/${path}?${new URLSearchParams(params)}`,
    {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
      revalidate: REVALIDATE_SECONDS,
    },
  )
  const payload: { data: T[] } = await response.json()
  return payload.data
}

export async function getTwitchLive(logins: string[]): Promise<LiveStream[]> {
  const batches = await Promise.all(
    chunk(logins, 100).map((batch) =>
      helix<TwitchStream>('streams', [
        ['first', '100'],
        ...batch.map((login): [string, string] => ['user_login', login]),
      ]),
    ),
  )
  return batches.flat().map(mapTwitchStream)
}

export async function getTwitchDiscover(): Promise<LiveStream[]> {
  const games = await helix<{ id: string }>(
    'games',
    DISCOVER_CATEGORIES.map((name): [string, string] => ['name', name]),
  )
  if (!games.length) return []

  const streams = await helix<TwitchStream>('streams', [
    ['first', '50'],
    ['language', DISCOVER_LANGUAGE],
    ...games.map((game): [string, string] => ['game_id', game.id]),
  ])
  return streams.map(mapTwitchStream)
}
