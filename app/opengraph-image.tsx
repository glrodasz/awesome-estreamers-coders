import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { streamers } from '@/lib/streamers'

export const alt = `${SITE_NAME}: directorio de streamers que enseñan programación en vivo en español`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#0b0b0b'
const PAPER = '#fff6e3'
const ACCENT = '#ffe14d'

const STICKERS = [
  { label: 'Twitch', background: '#9146ff', color: '#ffffff', rotate: -8 },
  { label: 'YouTube', background: '#ff0033', color: '#ffffff', rotate: 5 },
  { label: 'Kick', background: '#53fc18', color: INK, rotate: -3 },
]

/** Fetches a TTF subset (Google serves TTF to non-browser user agents); Satori can't read woff2. */
async function loadGoogleFont(family: string, weight: number, text: string) {
  try {
    const params = new URLSearchParams({ family: `${family}:wght@${weight}`, text })
    const css = await (await fetch(`https://fonts.googleapis.com/css2?${params}`)).text()
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Image() {
  const host = new URL(SITE_URL).host
  const title = ['Programación en vivo,', 'en español.']
  const subtitle = `${streamers.length} streamers en Twitch, YouTube y Kick`
  const mono = `<${SITE_NAME} />`

  const [display, code] = await Promise.all([
    loadGoogleFont('Bricolage Grotesque', 800, [...title, subtitle, ...STICKERS.map((s) => s.label)].join('')),
    loadGoogleFont('JetBrains Mono', 700, mono + host),
  ])
  const fonts = [
    display && { name: 'Display', data: display, weight: 800 as const },
    code && { name: 'Mono', data: code, weight: 700 as const },
  ].filter((font) => font !== null)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 60,
          background: PAPER,
          color: INK,
          fontFamily: 'Display',
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 30, fontWeight: 700 }}>{mono}</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
              <span>{title[0]}</span>
              <span
                style={{
                  marginTop: 14,
                  alignSelf: 'flex-start',
                  padding: '0 24px 6px',
                  background: ACCENT,
                  border: `5px solid ${INK}`,
                  borderRadius: 24,
                  boxShadow: `8px 8px 0 0 ${INK}`,
                  transform: 'rotate(-2deg)',
                }}
              >
                {title[1]}
              </span>
            </div>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#55524b' }}>{subtitle}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, paddingRight: 12 }}>
            {STICKERS.map((sticker) => (
              <span
                key={sticker.label}
                style={{
                  padding: '8px 28px',
                  fontSize: 34,
                  fontWeight: 800,
                  background: sticker.background,
                  color: sticker.color,
                  border: `5px solid ${INK}`,
                  borderRadius: 9999,
                  boxShadow: `6px 6px 0 0 ${INK}`,
                  transform: `rotate(${sticker.rotate}deg)`,
                }}
              >
                {sticker.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'Mono', fontSize: 26, fontWeight: 700 }}>{host}</div>
      </div>
    ),
    { ...size, fonts },
  )
}
