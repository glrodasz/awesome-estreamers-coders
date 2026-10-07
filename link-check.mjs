import { LINK_STATUSES_FILE, loadStreamers, readGenerated, writeGenerated } from './lib/data.mjs'
import { buildLinks } from './lib/links.mjs'

const data = loadStreamers()
const previous = readGenerated(LINK_STATUSES_FILE).entries
const today = new Date().toISOString().slice(0, 10)

async function checkUrl(url, timeoutMs = 10000) {
  const result = { status: 'broken', httpStatus: null }

  const attempts = [
    { method: 'HEAD' },
    { method: 'GET' },
  ]

  for (const attempt of attempts) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        method: attempt.method,
        redirect: 'follow',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      result.httpStatus = response.status
      if (response.ok) {
        result.status = 'ok'
        return result
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        result.error = 'Request timeout'
      } else {
        result.error = error.message
      }
    }
  }

  return result
}

async function checkLinks() {
  // Collect all links with person info
  const allLinks = []
  for (const person of data) {
    const links = buildLinks(person)
    for (const link of links) {
      allLinks.push({ person, link })
    }
  }

  const totalLinks = allLinks.length
  console.log(`Checking ${totalLinks} links across ${data.length} streamers...\n`)

  // Process links in batches for concurrency
  const batchSize = 10
  const checkedLinks = []
  let processed = 0

  for (let i = 0; i < allLinks.length; i += batchSize) {
    const batch = allLinks.slice(i, i + batchSize)
    const batchPromises = batch.map(async ({ person, link }) => {
      const status = await checkUrl(link.url)
      return { person, link, status }
    })

    const results = await Promise.allSettled(batchPromises)
    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled') {
        checkedLinks.push(result.value)
      } else {
        // Handle promise rejection (shouldn't happen, but just in case)
        const batchItem = batch[j]
        checkedLinks.push({
          person: batchItem.person,
          link: batchItem.link,
          status: { status: 'broken', httpStatus: null, error: result.reason?.message || 'Unknown error' },
        })
      }
    }

    processed += batch.length
    const percentage = Math.round((processed / totalLinks) * 100)
    console.log(`Progress: ${processed}/${totalLinks} (${percentage}%)`)
  }

  // Group results by streamer name; a link keeps the day it first broke.
  const entries = Object.fromEntries(data.map((person) => [person.name, []]))
  for (const { person, link, status } of checkedLinks) {
    const before = previous[person.name]?.find((item) => item.url === link.url)
    entries[person.name].push({
      ...link,
      ...status,
      ...(status.status !== 'ok' && { brokenSince: before?.brokenSince ?? today }),
    })
  }

  const broken = Object.entries(entries)
    .flatMap(([name, links]) => links.map((link) => ({ ...link, name })))
    .filter((link) => link.status !== 'ok')

  const written = writeGenerated(LINK_STATUSES_FILE, entries)
  console.log(`\nChecked ${totalLinks} links across ${data.length} streamers. ${written ? `Wrote ${LINK_STATUSES_FILE}.` : `${LINK_STATUSES_FILE} unchanged.`}`)
  if (broken.length) {
    console.log('\nBroken links:')
    broken.forEach((item) => {
      const statusText = item.httpStatus ? ` (${item.httpStatus})` : ''
      console.log(`- ${item.name} → ${item.label}: ${item.url}${statusText}${item.error ? ` — ${item.error}` : ''} (desde ${item.brokenSince})`)
    })
  } else {
    console.log('All links look good!')
  }
}

await checkLinks()
