import fs from 'fs/promises'

const data = JSON.parse(await fs.readFile('data.json', 'utf-8'))

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
  })

  return lines.join('\n')
})

const content = `${heading}\n${sections.join('\n\n')}\n`

await fs.writeFile('README.md', content, { encoding: 'utf-8' })
