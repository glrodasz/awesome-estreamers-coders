'use client'

import { useMemo, useState } from 'react'
import { countryFlag, formatDate } from '@/lib/format'
import type { Streamer } from '@/lib/streamers'
import { PLATFORM_LABELS, type Platform } from '@/lib/types'

type Props = {
  streamers: Streamer[]
  liveNames: string[]
}

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[]
const STAGGER_MS = 30
const MAX_STAGGER_STEPS = 12

/** Brand colors for link chips; unknown link types keep the neutral ink style. */
const LINK_STYLES: Record<string, string> = {
  youtube: 'bg-youtube text-white',
  twitch: 'bg-twitch text-white',
  kick: 'bg-kick text-black',
  x: 'bg-black text-white',
  facebook: 'bg-[#1877f2] text-white',
  github: 'bg-[#24292f] text-white',
  linkedin: 'bg-[#0a66c2] text-white',
  instagram: 'bg-[#e1306c] text-white',
  tiktok: 'bg-[#ff0050] text-white',
  bluesky: 'bg-[#1185fe] text-white',
  website: 'bg-accent text-black',
}

const ACTIVE_CHIP: Record<Platform | 'all', string> = {
  all: 'aria-pressed:bg-ink aria-pressed:text-paper',
  twitch: 'aria-pressed:bg-twitch aria-pressed:text-white',
  youtube: 'aria-pressed:bg-youtube aria-pressed:text-white',
  kick: 'aria-pressed:bg-kick aria-pressed:text-black',
}

export function Directory({ streamers, liveNames }: Props) {
  const [platform, setPlatform] = useState<Platform | 'all'>('all')
  const [country, setCountry] = useState('all')
  const [onlyLive, setOnlyLive] = useState(false)

  const live = useMemo(() => new Set(liveNames), [liveNames])
  const countries = useMemo(() => [...new Set(streamers.map((s) => s.country))], [streamers])

  const groups = useMemo(() => {
    const visible = streamers.filter(
      (s) =>
        (platform === 'all' || s.platforms.includes(platform)) &&
        (country === 'all' || s.country === country) &&
        (!onlyLive || live.has(s.name)),
    )
    let offset = 0
    return countries
      .map((c) => visible.filter((s) => s.country === c))
      .filter((people) => people.length)
      .map((people) => {
        const group = { country: people[0].country, people, offset }
        offset += people.length
        return group
      })
  }, [streamers, countries, platform, country, onlyLive, live])

  // Re-mounting the results on every filter change replays the staggered entrance.
  const filterKey = `${platform}|${country}|${onlyLive}`

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filtros">
        {(['all', ...PLATFORMS] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`chip px-4 py-1.5 text-sm ${ACTIVE_CHIP[p]}`}
            aria-pressed={platform === p}
            onClick={() => setPlatform(p)}
          >
            {p === 'all' ? 'Todas' : PLATFORM_LABELS[p]}
          </button>
        ))}
        <button
          type="button"
          className="chip flex items-center gap-2 px-4 py-1.5 text-sm aria-pressed:bg-live aria-pressed:text-white"
          aria-pressed={onlyLive}
          onClick={() => setOnlyLive(!onlyLive)}
        >
          <span className="size-2 rounded-full bg-live ring-2 ring-[#0b0b0b]" aria-hidden />
          Solo en vivo
        </button>
        <label className="sm:ml-auto">
          <span className="sr-only">País</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="chip cursor-pointer px-4 py-1.5 text-sm"
          >
            <option value="all">🌎 Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryFlag(c)} {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div key={filterKey} className="flex flex-col gap-10">
        {groups.length === 0 && (
          <p className="dashed-box pop-in">¯\_(ツ)_/¯ Nadie coincide con estos filtros.</p>
        )}

        {groups.map((group) => (
          <section key={group.country} aria-labelledby={`pais-${group.country}`} className="flex flex-col gap-4">
            <h3
              id={`pais-${group.country}`}
              className="sticker self-start bg-accent px-4 py-1 text-xl font-extrabold text-black [--tilt:-1.5deg]"
            >
              {countryFlag(group.country)} {group.country}
            </h3>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.people.map((s, index) => {
                const isLive = live.has(s.name)
                const delay = Math.min(group.offset + index, MAX_STAGGER_STEPS) * STAGGER_MS
                return (
                  <li
                    key={s.name}
                    className={`brutal-sm press pop-in flex flex-col gap-3 p-4 ${isLive ? '[--hover-shadow:var(--color-live)] [--shadow-color:var(--color-live)]' : ''}`}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-lg font-extrabold leading-tight">{s.name}</h4>
                      {isLive && (
                        <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-live px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                          <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                          En vivo
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-3 text-sm text-muted">{s.description}</p>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {s.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`rounded-md border-2 border-ink px-2 py-0.5 font-mono text-xs font-semibold transition duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0_0_var(--ink)] active:translate-0 active:shadow-none ${LINK_STYLES[link.type] ?? 'hover:bg-ink hover:text-paper'}`}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                    <p className="border-t-2 border-dashed border-ink/30 pt-2 font-mono text-[11px] text-muted">
                      {isLive
                        ? '● Transmitiendo ahora'
                        : s.lastLive
                          ? `Último directo: ${formatDate(s.lastLive)}`
                          : 'Último directo: sin verificar'}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
