import fs from 'fs/promises'
import path from 'path'

const dataPath = path.resolve('data.json')
const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'))

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET
const youtubeCache = new Map()
let twitchAuth

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildYouTubeUrl(identifier) {
  if (/^https?:\/\//i.test(identifier)) return identifier
  return `https://www.youtube.com/${identifier}`
}

async function resolveYouTubeChannelId(identifier) {
  if (!identifier) return null
  if (/^UC[A-Za-z0-9_-]{22}$/i.test(identifier)) return identifier

  const slug = identifier.replace(/^channel\//i, '')
  if (/^UC[A-Za-z0-9_-]{22}$/i.test(slug)) return slug

  const url = buildYouTubeUrl(identifier)
  const cached = youtubeCache.get(url)
  if (cached) return cached

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(oembedUrl)
    if (!response.ok) throw new Error(`oEmbed request failed with status ${response.status}`)
    const payload = await response.json()
    const channelFromAuthor = payload?.author_url?.match(/youtube\.com\/channel\/([^/?]+)/i)
    if (channelFromAuthor) {
      youtubeCache.set(url, channelFromAuthor[1])
      return channelFromAuthor[1]
    }
  } catch (error) {
    console.warn(`[YouTube] Could not resolve channel for ${identifier}: ${error.message}`)
  }

  return null
}

async function fetchYouTubeLastUpload(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const response = await fetch(feedUrl)
  if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`)
  const feed = await response.text()

  const firstEntryMatch = feed.match(/<entry>.*?<published>(.*?)<\/published>/s)
  if (!firstEntryMatch) throw new Error('No entries found in feed')

  return firstEntryMatch[1]
}

async function getTwitchAuth() {
  if (twitchAuth) return twitchAuth
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set')
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  })

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!response.ok) throw new Error(`Twitch auth failed with status ${response.status}`)
  twitchAuth = await response.json()
  return twitchAuth
}

async function twitchApi(pathname) {
  const auth = await getTwitchAuth()
  const response = await fetch(`https://api.twitch.tv/helix/${pathname}`, {
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      Authorization: `Bearer ${auth.access_token}`,
    },
  })
  if (!response.ok) throw new Error(`Twitch API ${pathname} failed with status ${response.status}`)
  return response.json()
}

async function resolveTwitchUser(login) {
  const payload = await twitchApi(`users?login=${encodeURIComponent(login)}`)
  return payload.data?.[0] || null
}

async function fetchTwitchStatuses(login) {
  const user = await resolveTwitchUser(login)
  if (!user) throw new Error('User not found')

  const livePayload = await twitchApi(`streams?user_login=${encodeURIComponent(login)}`)
  const isLive = livePayload.data?.[0]
  const liveStatus = isLive ? isLive.started_at : null

  const videosPayload = await twitchApi(`videos?user_id=${user.id}&first=1&sort=time&type=all`)
  const lastVideo = videosPayload.data?.[0]?.created_at || null

  return { userId: user.id, login: user.login, lastLive: liveStatus, lastVideo }
}

async function buildStatuses() {
  const entries = await Promise.all(
    data.map(async (person, index) => {
      const status = { name: person.name }

      if (person.youtube) {
        try {
          const channelId = await resolveYouTubeChannelId(person.youtube)
          if (channelId) {
            const lastUpload = await fetchYouTubeLastUpload(channelId)
            status.youtube = { channelId, lastUpload }
          } else {
            console.warn(`[YouTube] Unable to resolve channel id for ${person.name}`)
            status.youtube = {}
          }
        } catch (error) {
          console.warn(`[YouTube] Error fetching status for ${person.name}: ${error.message}`)
          status.youtube = {}
        }
      }

      if (person.twitch) {
        try {
          const twitchStatus = await fetchTwitchStatuses(person.twitch)
          status.twitch = twitchStatus
        } catch (error) {
          console.warn(`[Twitch] Error fetching status for ${person.name}: ${error.message}`)
          status.twitch = {}
        }
      }

      if (index % 5 === 0) await sleep(150)
      return status
    })
  )

  const payload = {
    generatedAt: new Date().toISOString(),
    entries,
  }

  await fs.writeFile('statuses.json', JSON.stringify(payload, null, 2), 'utf-8')
  console.log('Wrote statuses.json with', entries.length, 'entries')
}

await buildStatuses()
