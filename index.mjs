import { markdownTable } from 'markdown-table'
import fs from 'fs/promises'

const table = markdownTable([
  ['Branch', 'Commit'],
  ['main', '0123456789abcdef'],
  ['staging', 'fedcba9876543210']
])

const heading = `
# Awesome EStreamers Coders
ℹ️ Si estas haciendo streaming en Twitch o YouTube sobre contenido relacionado a la tecnología o programación eres bienvenida o bienvenido de hacer un PR agregando tu información en esta lista.

`

await fs.writeFile("table.md", heading + table, { encoding: "utf-8"})
