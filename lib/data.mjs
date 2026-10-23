import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { acceptsHandle, channelHandle, isUrl } from './links.mjs'

/**
 * @typedef {{ name: string, description: string, country: string, links: Record<string, string> }} Streamer
 * @typedef {{ generatedAt: string | null, entries: Record<string, any> }} GeneratedFile
 */

export const STREAMERS_FILE = 'streamers.yml'
export const DISCOVER_FILE = 'discover.yml'
export const STATUSES_FILE = 'generated/statuses.json'
export const LINK_STATUSES_FILE = 'generated/link-statuses.json'

const FIELDS = ['name', 'description', 'country', 'links']

/** Old link keys and the key to use instead, so the list stays consistent. */
const RENAMED_LINKS = { twitter: 'x' }

/**
 * Returns a list of human-readable problems; empty when the list is valid.
 * @param {unknown} list
 */
export function validateStreamers(list) {
  if (!Array.isArray(list)) return [`${STREAMERS_FILE} debe ser una lista de streamers.`]

  const errors = []
  const seen = new Set()

  list.forEach((person, index) => {
    const where = `Entrada #${index + 1}${person?.name ? ` (${person.name})` : ''}`
    if (!person || typeof person !== 'object' || Array.isArray(person)) {
      errors.push(`${where}: debe ser un objeto con ${FIELDS.join(', ')}.`)
      return
    }

    for (const key of Object.keys(person)) {
      if (!FIELDS.includes(key)) errors.push(`${where}: campo desconocido "${key}". Campos válidos: ${FIELDS.join(', ')}.`)
    }
    for (const key of ['name', 'description', 'country']) {
      if (typeof person[key] !== 'string' || !person[key].trim()) errors.push(`${where}: falta "${key}".`)
    }

    if (typeof person.name === 'string') {
      if (seen.has(person.name)) errors.push(`${where}: el nombre "${person.name}" está repetido.`)
      seen.add(person.name)
    }

    const { links } = person
    if (!links || typeof links !== 'object' || Array.isArray(links) || !Object.keys(links).length) {
      errors.push(`${where}: "links" debe tener al menos un enlace, por ejemplo "twitch: tu_usuario".`)
      return
    }
    for (const [key, value] of Object.entries(links)) {
      if (key in RENAMED_LINKS) {
        errors.push(`${where}: usa "${RENAMED_LINKS[key]}" en lugar de "${key}".`)
      } else if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${where}: el enlace "${key}" está vacío.`)
      } else if (!isUrl(value) && !acceptsHandle(key)) {
        errors.push(`${where}: el enlace "${key}" debe ser una URL completa (https://…).`)
      }
    }
  })

  return errors
}

/** @param {string} root */
export function loadStreamers(root = process.cwd()) {
  const list = parse(fs.readFileSync(path.join(root, STREAMERS_FILE), 'utf-8'))
  const errors = validateStreamers(list)
  if (errors.length) throw new Error(`${STREAMERS_FILE} no es válido:\n- ${errors.join('\n- ')}`)
  return /** @type {Streamer[]} */ (list)
}

const DISCOVER_PLATFORMS = ['twitch', 'kick', 'youtube']

/**
 * Returns a list of human-readable problems in discover.yml; empty when it is valid.
 * @param {unknown} list
 */
export function validateDiscover(list) {
  if (list == null) return []
  if (!Array.isArray(list)) return [`${DISCOVER_FILE} debe ser una lista de canales agrupados por plataforma.`]

  const errors = []
  const seen = new Set()

  list.forEach((group, index) => {
    const where = `Entrada #${index + 1}`
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      errors.push(`${where}: debe agrupar canales por plataforma, por ejemplo "twitch: usuario".`)
      return
    }
    const entries = Object.entries(group)
    if (entries.length < 2) errors.push(`${where}: debe tener al menos dos plataformas.`)
    for (const [platform, channel] of entries) {
      if (!DISCOVER_PLATFORMS.includes(platform)) {
        errors.push(`${where}: plataforma desconocida "${platform}". Plataformas válidas: ${DISCOVER_PLATFORMS.join(', ')}.`)
      } else if (typeof channel !== 'string' || !channel.trim()) {
        errors.push(`${where}: el canal de "${platform}" está vacío.`)
      } else {
        const key = `${platform}:${channelHandle(channel)}`
        if (seen.has(key)) errors.push(`${where}: el canal "${key}" está repetido.`)
        seen.add(key)
      }
    }
  })

  return errors
}

/**
 * Maps each "platform:channel" key (lowercased) in discover.yml to the id of its group,
 * so channels of the same person are shown together.
 * @param {string} root
 * @returns {Map<string, string>}
 */
export function loadDiscoverGroups(root = process.cwd()) {
  const list = parse(fs.readFileSync(path.join(root, DISCOVER_FILE), 'utf-8'))
  const errors = validateDiscover(list)
  if (errors.length) throw new Error(`${DISCOVER_FILE} no es válido:\n- ${errors.join('\n- ')}`)
  /** @type {Record<string, string>[]} */
  const groups = list ?? []
  return new Map(
    groups.flatMap((group, index) =>
      Object.entries(group).map(([platform, channel]) => [`${platform}:${channelHandle(channel)}`, `group:${index}`]),
    ),
  )
}

/**
 * @param {string} file
 * @returns {GeneratedFile}
 */
export function readGenerated(file, root = process.cwd()) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, file), 'utf-8'))
    if (parsed && typeof parsed.entries === 'object') return parsed
  } catch {
    // Missing or unreadable: start from an empty file.
  }
  return { generatedAt: null, entries: {} }
}

/**
 * Writes `{ generatedAt, entries }` keyed by streamer name. Skips the write when
 * the entries did not change, so scheduled runs only commit real changes.
 * @param {string} file
 * @param {Record<string, any>} entries
 * @returns {boolean} whether the file was written
 */
export function writeGenerated(file, entries, root = process.cwd()) {
  const previous = readGenerated(file, root)
  if (JSON.stringify(previous.entries) === JSON.stringify(entries)) return false
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`)
  return true
}
