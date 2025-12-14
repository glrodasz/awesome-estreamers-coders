import fs from 'fs/promises'

const data = JSON.parse(await fs.readFile('data.json', 'utf-8'))
const statuses = await readStatuses()
const statusByName = new Map(statuses.entries.map((entry) => [entry.name, entry]))

const heading = `# Awesome EStreamers Coders

ℹ️ Si estas haciendo streaming en Twitch o YouTube sobre contenido relacionado a la tecnología o programación eres bienvenida o bienvenido de hacer un PR agregando tu información en esta lista.
`

const countryOrder = data.reduce((order, entry) => {
  if (!order.includes(entry.country)) order.push(entry.country)
  return order
}, [])

const sections = countryOrder.map((country) => {
  const people = data.filter((item) => item.country === country)
  const lines = [`## ${country}\n`]

  people.forEach(({ name, description, links }) => {
    lines.push(`- **${name}** — ${description}`)
    const formattedLinks = links.map((link) => `[${link.label}](${link.url})`).join(' · ')
    lines.push(`  - ${formattedLinks}`)

    const status = statusByName.get(name)
    const activityLine = buildActivityLine(status)
    if (activityLine) {
      lines.push(`  - ${activityLine}`)
    }
  })

  return lines.join('\n')
})

const content = `${heading}\n${sections.join('\n\n')}\n`

await fs.writeFile('README.md', content, { encoding: 'utf-8' })

function buildActivityLine(status) {
  if (!status) return 'Última actividad → Desconocida'

  const parts = []
  if (status.youtube?.lastUpload) {
    parts.push(`YouTube: ${formatTimestamp(status.youtube.lastUpload)}`)
  } else if (status.youtube) {
    parts.push('YouTube: Desconocida')
  }

  if (status.twitch?.lastLive) {
    parts.push(`Twitch en vivo desde: ${formatTimestamp(status.twitch.lastLive)}`)
  } else if (status.twitch?.lastVideo) {
    parts.push(`Twitch último video: ${formatTimestamp(status.twitch.lastVideo)}`)
  } else if (status.twitch) {
    parts.push('Twitch: Desconocida')
  }

  if (!parts.length) return 'Última actividad → Desconocida'
  return `Última actividad → ${parts.join(' · ')}`
}

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

async function readStatuses() {
  try {
    const raw = await fs.readFile('statuses.json', 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.entries)) return parsed
  } catch (error) {
    console.warn('No statuses.json found, skipping activity section')
  }
  return { generatedAt: null, entries: [] }
}
