import fs from 'fs/promises'
import path from 'path'
import { config } from 'dotenv'

config()

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
  
  // Handle different YouTube URL formats
  if (identifier.startsWith('@')) {
    return `https://www.youtube.com/${identifier}`
  }
  if (identifier.startsWith('c/') || identifier.startsWith('user/') || identifier.startsWith('channel/')) {
    return `https://www.youtube.com/${identifier}`
  }
  
  // Try handle format first for simple identifiers
  return `https://www.youtube.com/@${identifier}`
}

async function resolveYouTubeChannelId(identifier) {
  if (!identifier) return null
  if (/^UC[A-Za-z0-9_-]{22}$/i.test(identifier)) return identifier

  const slug = identifier.replace(/^channel\//i, '')
  if (/^UC[A-Za-z0-9_-]{22}$/i.test(slug)) return slug

  // Build channel page URLs to try
  const channelUrls = []
  
  if (/^https?:\/\//i.test(identifier)) {
    channelUrls.push(identifier)
  } else if (identifier.startsWith('@')) {
    channelUrls.push(`https://www.youtube.com/${identifier}`)
  } else if (identifier.startsWith('c/')) {
    channelUrls.push(`https://www.youtube.com/${identifier}`)
  } else if (identifier.startsWith('user/')) {
    channelUrls.push(`https://www.youtube.com/${identifier}`)
  } else {
    // Try handle format first, then fallback formats
    channelUrls.push(`https://www.youtube.com/@${identifier}`)
    channelUrls.push(`https://www.youtube.com/c/${identifier}`)
    channelUrls.push(`https://www.youtube.com/user/${identifier}`)
  }

  // Check cache first
  for (const url of channelUrls) {
    const cached = youtubeCache.get(url)
    if (cached) return cached
  }

  // Scrape channel page HTML to extract channel ID
  for (const url of channelUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      if (!response.ok) continue
      
      const html = await response.text()
      
      // Method 1: Look for channel ID in JSON-LD structured data
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs)
      if (jsonLdMatch) {
        for (const jsonLd of jsonLdMatch) {
          try {
            const json = JSON.parse(jsonLd.replace(/<script[^>]*>|<\/script>/g, ''))
            const channelId = findChannelIdInObject(json)
            if (channelId) {
              channelUrls.forEach(u => youtubeCache.set(u, channelId))
              return channelId
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Method 2: Look for channel ID in ytInitialData
      const ytDataMatch = html.match(/var ytInitialData = ({.*?});/s)
      if (ytDataMatch) {
        try {
          const data = JSON.parse(ytDataMatch[1])
          const channelId = findChannelIdInObject(data)
          if (channelId) {
            channelUrls.forEach(u => youtubeCache.set(u, channelId))
            return channelId
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Method 3: Look for channel ID in various HTML patterns
      const patterns = [
        /"channelId":"([A-Za-z0-9_-]{22})"/i,
        /"externalId":"([A-Za-z0-9_-]{22})"/i,
        /channel_id=([A-Za-z0-9_-]{22})/i,
        /youtube\.com\/channel\/([A-Za-z0-9_-]{22})/i,
        /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/([A-Za-z0-9_-]{22})"/i,
        /"browseId":"([A-Za-z0-9_-]{22})"/i
      ]
      
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1]?.startsWith('UC')) {
          const channelId = match[1]
          channelUrls.forEach(u => youtubeCache.set(u, channelId))
          return channelId
        }
      }
    } catch (error) {
      continue
    }
  }

  console.warn(`[YouTube] Could not resolve channel for ${identifier}`)
  return null
}

function findChannelIdInObject(obj) {
  if (!obj || typeof obj !== 'object') return null
  
  // Look for channel ID in common YouTube data structures
  if (obj.channelId && /^UC[A-Za-z0-9_-]{22}$/i.test(obj.channelId)) {
    return obj.channelId
  }
  if (obj.externalId && /^UC[A-Za-z0-9_-]{22}$/i.test(obj.externalId)) {
    return obj.externalId
  }
  if (obj.browseId && /^UC[A-Za-z0-9_-]{22}$/i.test(obj.browseId)) {
    return obj.browseId
  }
  
  // Recursively search nested objects
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findChannelIdInObject(obj[key])
      if (result) return result
    }
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
  let liveStatus = isLive ? isLive.started_at : null

  // If not currently live, check archived streams for last live time
  if (!liveStatus) {
    const archivedPayload = await twitchApi(`videos?user_id=${user.id}&first=1&sort=time&type=archive`)
    liveStatus = archivedPayload.data?.[0]?.created_at || null
  }

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
