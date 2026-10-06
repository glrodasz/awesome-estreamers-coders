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

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
      : 'border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500'
  }`
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
    return countries
      .map((c) => ({ country: c, people: visible.filter((s) => s.country === c) }))
      .filter((group) => group.people.length)
  }, [streamers, countries, platform, country, onlyLive, live])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros">
        <button type="button" className={chipClass(platform === 'all')} aria-pressed={platform === 'all'} onClick={() => setPlatform('all')}>
          Todas
        </button>
        {PLATFORMS.map((p) => (
          <button key={p} type="button" className={chipClass(platform === p)} aria-pressed={platform === p} onClick={() => setPlatform(p)}>
            {PLATFORM_LABELS[p]}
          </button>
        ))}
        <button type="button" className={chipClass(onlyLive)} aria-pressed={onlyLive} onClick={() => setOnlyLive(!onlyLive)}>
          🔴 Solo en vivo
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="sr-only">País</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="rounded-full border border-zinc-300 bg-transparent px-3 py-1 dark:border-zinc-700"
          >
            <option value="all">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryFlag(c)} {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          Nadie coincide con estos filtros.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.country} aria-labelledby={`pais-${group.country}`}>
          <h3 id={`pais-${group.country}`} className="mb-3 text-lg font-semibold">
            {countryFlag(group.country)} {group.country}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.people.map((s) => (
              <li key={s.name} className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  {live.has(s.name) && (
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-red-600" aria-label="En vivo" />
                  )}
                  <h4 className="font-semibold">{s.name}</h4>
                </div>
                <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{s.description}</p>
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {s.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:text-zinc-300 dark:decoration-zinc-600">
                      {link.label}
                    </a>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  {live.has(s.name)
                    ? 'En vivo ahora'
                    : s.lastActivity
                      ? `Última actividad: ${formatDate(s.lastActivity)}`
                      : 'Última actividad: desconocida'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
