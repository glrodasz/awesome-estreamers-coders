import fs from 'fs/promises'

const data = JSON.parse(await fs.readFile('data.json', 'utf-8'))

function buildYouTubeUrl(identifier) {
  if (/^https?:\/\//i.test(identifier)) return identifier
  return `https://www.youtube.com/${identifier}`
}

function buildTwitchUrl(login) {
  if (/^https?:\/\//i.test(login)) return login
  return `https://www.twitch.tv/${login}`
}

function buildTwitterUrl(handle) {
  if (/^https?:\/\//i.test(handle)) return handle
  return `https://twitter.com/${handle.replace(/^@/, '')}`
}

function buildFacebookUrl(handle) {
  if (/^https?:\/\//i.test(handle)) return handle
  return `https://www.facebook.com/${handle}`
}

function buildLinks(person) {
  const links = []

  if (person.website) {
    links.push({ label: 'Sitio web', url: person.website })
  }

  if (person.youtube) {
    links.push({ label: 'YouTube', url: buildYouTubeUrl(person.youtube) })
  }

  if (person.twitch) {
    links.push({ label: 'Twitch', url: buildTwitchUrl(person.twitch) })
  }

  if (person.twitter) {
    links.push({ label: 'Twitter', url: buildTwitterUrl(person.twitter) })
  }

  if (person.facebook) {
    links.push({ label: 'Facebook', url: buildFacebookUrl(person.facebook) })
  }

  if (Array.isArray(person.otherLinks)) {
    links.push(...person.otherLinks)
  }

  return links
}

async function checkUrl(url, timeoutMs = 10000) {
  const checkedAt = new Date().toISOString()
  const result = { status: 'broken', httpStatus: null, checkedAt }

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
          status: { status: 'broken', error: result.reason?.message || 'Unknown error', checkedAt: new Date().toISOString() },
        })
      }
    }

    processed += batch.length
    const percentage = Math.round((processed / totalLinks) * 100)
    console.log(`Progress: ${processed}/${totalLinks} (${percentage}%)`)
  }

  // Group checked links back by person
  const personMap = new Map()
  for (const person of data) {
    personMap.set(person, [])
  }

  for (const { person, link, status } of checkedLinks) {
    personMap.get(person)?.push({ ...link, ...status })
  }

  const updated = Array.from(personMap.entries()).map(([person, linkStatuses]) => ({
    ...person,
    linkStatuses,
  }))

  const broken = updated
    .flatMap((entry) => entry.linkStatuses.map((link) => ({ ...link, name: entry.name })))
    .filter((link) => link.status !== 'ok')

  await fs.writeFile('data.json', JSON.stringify(updated, null, 2), 'utf-8')

  console.log(`\nChecked ${totalLinks} links across ${updated.length} streamers.`)
  if (broken.length) {
    console.log('\nBroken links:')
    broken.forEach((item) => {
      const statusText = item.httpStatus ? ` (${item.httpStatus})` : ''
      console.log(`- ${item.name} → ${item.label}: ${item.url}${statusText}${item.error ? ` — ${item.error}` : ''}`)
    })
  } else {
    console.log('All links look good!')
  }
}

await checkLinks()
