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

// TrueType, OpenType (CFF) and Apple TrueType signatures: the formats Satori can read.
const FONT_SIGNATURES = ['00010000', '4f54544f', '74727565']

function isFont(data: ArrayBuffer) {
  const signature = [...new Uint8Array(data.slice(0, 4))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return FONT_SIGNATURES.includes(signature)
}

/**
 * Fetches a TTF subset (Google serves TTF to non-browser user agents); Satori can't read woff2.
 * Returns null on any failure, including an error page instead of a font, so the image falls
 * back to the default font instead of failing the build.
 */
async function loadGoogleFont(family: string, weight: number, text: string) {
  try {
    const params = new URLSearchParams({ family: `${family}:wght@${weight}`, text })
    const cssResponse = await fetch(`https://fonts.googleapis.com/css2?${params}`)
    if (!cssResponse.ok) throw new Error(`CSS request failed with status ${cssResponse.status}`)
    const url = (await cssResponse.text()).match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) throw new Error('no TTF/OTF source in the CSS')
    const fontResponse = await fetch(url)
    if (!fontResponse.ok) throw new Error(`font request failed with status ${fontResponse.status}`)
    const data = await fontResponse.arrayBuffer()
    if (!isFont(data)) throw new Error('response is not a TTF/OTF font')
    return data
  } catch (error) {
    console.warn(`[opengraph-image] ${family} ${weight} unavailable, using the default font: ${(error as Error).message}`)
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
    // An empty list would also drop the built-in default font.
    { ...size, ...(fonts.length > 0 && { fonts }) },
  )
}
