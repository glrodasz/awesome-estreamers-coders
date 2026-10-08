import fs from 'fs/promises'
import { lastLiveDate } from './lib/activity.mjs'
import { loadStreamers, readGenerated, STATUSES_FILE, STREAMERS_FILE } from './lib/data.mjs'
import { buildLinks } from './lib/links.mjs'

const data = loadStreamers()
const statuses = readGenerated(STATUSES_FILE).entries

const heading = `# Awesome EStreamers Coders

ℹ️ Si estas haciendo streaming en Twitch, YouTube o Kick sobre contenido relacionado a la tecnología o programación eres bienvenida o bienvenido de hacer un PR agregando tu información en esta lista. Mira [cómo agregarte](#cómo-agregarte).
`

const contributing = `## ¿Cómo agregarte?

Edita [\`${STREAMERS_FILE}\`](${STREAMERS_FILE}), agrega tu entrada al final y abre un PR:

\`\`\`yaml
- name: Tu Nombre
  description: Qué enseñas en tus streams.
  country: México
  links:
    twitch: tu_usuario
    youtube: "@tu_canal"
    website: https://tusitio.dev
\`\`\`

- \`youtube\`, \`twitch\`, \`kick\`, \`twitter\`, \`x\`, \`facebook\` y \`github\` aceptan tu usuario o la URL completa.
- Cualquier otro enlace (\`website\`, \`linkedin\`, \`instagram\`, …) necesita la URL completa.
- Puedes validar tu cambio con \`npm run validate\`. No edites \`README.md\` ni \`generated/\`: se generan solos.
`

const countryOrder = data.reduce((order, entry) => {
  if (!order.includes(entry.country)) order.push(entry.country)
  return order
}, [])

const sections = countryOrder.map((country) => {
  const people = data.filter((item) => item.country === country)
  const lines = [`## ${country}\n`]

  people.forEach((person) => {
    const { name, description } = person
    lines.push(`- **${name}** — ${description}`)
    const formattedLinks = formatLinks(person)
    lines.push(`  - ${formattedLinks}`)

    const status = statuses[name]
    lines.push(`  - ${buildActivityLine(status)}`)
  })

  return lines.join('\n')
})

const content = `${heading}\n${sections.join('\n\n')}\n\n${contributing}`

await fs.writeFile('README.md', content, { encoding: 'utf-8' })
console.log('✅ Successfully generated README.md')

function buildActivityLine(status) {
  const lastLive = lastLiveDate(status)
  if (!lastLive) return 'Último directo → sin verificar'
  return `Último directo comprobado → ${formatTimestamp(lastLive)}`
}

function formatLinks(person) {
  return buildLinks(person)
    .map((link) => `[${link.label}](${link.url})`)
    .join(' · ')
}

function formatTimestamp(value) {
  try {
    // UTC so the README is identical whether it is generated locally or in CI.
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}
