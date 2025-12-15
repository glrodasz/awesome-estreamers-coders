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

function buildDiscordUrl(invite) {
  if (/^https?:\/\//i.test(invite)) return invite
  return `https://discord.gg/${invite}`
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

  if (person.discord) {
    links.push({ label: 'Discord', url: buildDiscordUrl(person.discord) })
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

async function checkUrl(url) {
  const checkedAt = new Date().toISOString()
  const result = { status: 'broken', httpStatus: null, checkedAt }

  const attempts = [
    { method: 'HEAD' },
    { method: 'GET' },
  ]

  for (const attempt of attempts) {
    try {
      const response = await fetch(url, { method: attempt.method, redirect: 'follow' })
      result.httpStatus = response.status
      if (response.ok) {
        result.status = 'ok'
        return result
      }
    } catch (error) {
      result.error = error.message
    }
  }

  return result
}

async function checkLinks() {
  const entries = []

  for (const person of data) {
    const links = buildLinks(person)
    const checked = []

    for (const link of links) {
      const status = await checkUrl(link.url)
      checked.push({ ...link, ...status })
    }

    entries.push({ name: person.name, links: checked })
  }

  const broken = entries
    .flatMap((entry) => entry.links.map((link) => ({ ...link, name: entry.name })))
    .filter((link) => link.status !== 'ok')

  const payload = {
    checkedAt: new Date().toISOString(),
    entries,
    broken,
  }

  await fs.writeFile('link-statuses.json', JSON.stringify(payload, null, 2), 'utf-8')

  console.log(`Checked ${entries.reduce((sum, entry) => sum + entry.links.length, 0)} links across ${entries.length} streamers.`)
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
