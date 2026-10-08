import { describe, expect, it } from 'vitest'
import { loadStreamers, validateStreamers } from './data.mjs'
import { buildLinks } from './links.mjs'

const valid = {
  name: 'Ada',
  description: 'Rust en vivo',
  country: 'México',
  links: { twitch: 'ada_dev', website: 'https://ada.dev' },
}

describe('validateStreamers', () => {
  it('accepts the real list', () => {
    expect(loadStreamers().length).toBeGreaterThan(0)
  })

  it('accepts a minimal entry', () => {
    expect(validateStreamers([valid])).toEqual([])
  })

  it('reports missing fields, typos, duplicates and bad links', () => {
    const errors = validateStreamers([
      valid,
      { ...valid, description: '' },
      { name: 'Bob', descripton: 'typo', country: 'Chile', links: {} },
      { name: 'Eve', description: 'x', country: 'Perú', links: { linkedin: 'eve', twitch: '' } },
      { name: 'Max', description: 'x', country: 'Chile', links: { twitter: 'max' } },
    ])
    expect(errors).toEqual([
      'Entrada #2 (Ada): falta "description".',
      'Entrada #2 (Ada): el nombre "Ada" está repetido.',
      'Entrada #3 (Bob): campo desconocido "descripton". Campos válidos: name, description, country, links.',
      'Entrada #3 (Bob): falta "description".',
      'Entrada #3 (Bob): "links" debe tener al menos un enlace, por ejemplo "twitch: tu_usuario".',
      'Entrada #4 (Eve): el enlace "linkedin" debe ser una URL completa (https://…).',
      'Entrada #4 (Eve): el enlace "twitch" está vacío.',
      'Entrada #5 (Max): usa "x" en lugar de "twitter".',
    ])
  })

  it('rejects a file that is not a list', () => {
    expect(validateStreamers({ name: 'Ada' })).toEqual(['streamers.yml debe ser una lista de streamers.'])
  })
})

describe('buildLinks', () => {
  it('keeps YAML order, expands handles and labels unknown keys', () => {
    expect(
      buildLinks({
        links: {
          youtube: '@ada',
          twitch: 'https://www.twitch.tv/ada_dev',
          linkedin: 'https://linkedin.com/in/ada',
          mastodon: 'https://hachyderm.io/@ada',
        },
      }),
    ).toEqual([
      { type: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@ada' },
      { type: 'twitch', label: 'Twitch', url: 'https://www.twitch.tv/ada_dev' },
      { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/in/ada' },
      { type: 'mastodon', label: 'Mastodon', url: 'https://hachyderm.io/@ada' },
    ])
  })
})
