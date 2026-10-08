import { config } from 'dotenv'
import { kickLastLive, latestLiveStart, mostRecent, parseFeedVideoIds, twitchLastLive } from './lib/activity.mjs'
import { loadStreamers, readGenerated, STATUSES_FILE, writeGenerated } from './lib/data.mjs'
import { channelHandle } from './lib/links.mjs'

config()

const data = loadStreamers()
const previous = readGenerated(STATUSES_FILE).entries

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Per-streamer errors only warn, so without credentials CI would pass while nothing updates.
if (process.env.CI) {
  const missing = ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'YOUTUBE_API_KEY'].filter((name) => !process.env[name])
  if (missing.length) {
    console.error(`Missing required secrets in CI: ${missing.join(', ')}`)
    process.exit(1)
  }
}

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

async function fetchYouTubeFeed(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const response = await fetch(feedUrl)
  if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`)
  return response.text()
}

function feedLastUpload(feed) {
  const firstEntryMatch = feed.match(/<entry>.*?<published>(.*?)<\/published>/s)
  if (!firstEntryMatch) throw new Error('No entries found in feed')

  return firstEntryMatch[1]
}

// The feed lists the latest ~15 videos, past live streams included; one videos.list
// call (1 quota unit) tells which of them were broadcast live and when.
async function fetchYouTubeLastLive(feed) {
  const ids = parseFeedVideoIds(feed)
  if (!ids.length) return null

  const params = new URLSearchParams({ part: 'liveStreamingDetails', id: ids.join(','), key: YOUTUBE_API_KEY })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  if (!response.ok) throw new Error(`videos.list failed with status ${response.status}`)
  const payload = await response.json()
  return latestLiveStart(payload.items ?? [])
}

// Lives older than the feed. search.list costs 100 quota units, so it only runs
// while no live date is known for the channel.
async function searchYouTubeLastLive(channelId) {
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    eventType: 'completed',
    type: 'video',
    order: 'date',
    maxResults: '1',
    key: YOUTUBE_API_KEY,
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!response.ok) throw new Error(`search.list failed with status ${response.status}`)
  const payload = await response.json()
  return payload.items?.[0]?.snippet?.publishedAt ?? null
}

// Unofficial endpoint (the public API only reports the current stream); it may be
// blocked, in which case the last known date is kept.
async function fetchKickLastLive(slug) {
  const response = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}/videos`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (awesome-estreamers-coders)' },
  })
  if (!response.ok) throw new Error(`Kick videos request failed with status ${response.status}`)
  const payload = await response.json()
  return kickLastLive(Array.isArray(payload) ? payload : payload.data ?? [])
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
  const videosPayload = await twitchApi(`videos?user_id=${user.id}&first=100&sort=time&type=all`)
  const videos = videosPayload.data ?? []
  const liveStatus = livePayload.data?.[0]?.started_at ?? twitchLastLive(videos)
  const lastVideo = videos[0]?.created_at || null

  return { userId: user.id, login: user.login, lastLive: liveStatus, lastVideo }
}

async function buildStatuses() {
  const entries = await Promise.all(
    data.map(async (person, index) => {
      const { youtube, twitch, kick } = person.links
      // A failed lookup keeps the last known value instead of erasing it.
      const last = previous[person.name] ?? {}
      const status = {}

      if (youtube) {
        try {
          const channelId = await resolveYouTubeChannelId(youtube)
          if (!channelId) throw new Error('Unable to resolve channel id')
          const feed = await fetchYouTubeFeed(channelId)
          status.youtube = { channelId, lastUpload: feedLastUpload(feed) }
          // Older lives drop out of the feed, so keep the last known date when none is found.
          let found = null
          if (YOUTUBE_API_KEY) {
            try {
              found = await fetchYouTubeLastLive(feed)
              if (!found && !last.youtube?.lastLive) found = await searchYouTubeLastLive(channelId)
            } catch (error) {
              console.warn(`[YouTube] Error fetching lives for ${person.name}: ${error.message}`)
            }
          }
          const lastLive = mostRecent([last.youtube?.lastLive, found])
          if (lastLive) status.youtube.lastLive = lastLive
        } catch (error) {
          console.warn(`[YouTube] Error fetching status for ${person.name}: ${error.message}`)
          status.youtube = last.youtube ?? {}
        }
      }

      if (twitch) {
        try {
          status.twitch = await fetchTwitchStatuses(channelHandle(twitch))
          // Past broadcasts expire on Twitch: keep the last date we saw.
          status.twitch.lastLive = mostRecent([status.twitch.lastLive, last.twitch?.lastLive])
        } catch (error) {
          console.warn(`[Twitch] Error fetching status for ${person.name}: ${error.message}`)
          status.twitch = last.twitch ?? {}
        }
      }

      if (kick) {
        try {
          const lastLive = mostRecent([await fetchKickLastLive(channelHandle(kick)), last.kick?.lastLive])
          status.kick = lastLive ? { lastLive } : {}
        } catch (error) {
          console.warn(`[Kick] Error fetching status for ${person.name}: ${error.message}`)
          status.kick = last.kick ?? {}
        }
      }

      if (index % 5 === 0) await sleep(150)
      return [person.name, status]
    })
  )

  const written = writeGenerated(STATUSES_FILE, Object.fromEntries(entries))
  console.log(written ? `Wrote ${STATUSES_FILE} with ${entries.length} entries` : `${STATUSES_FILE} unchanged`)
}

await buildStatuses()
