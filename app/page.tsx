import { CountUp } from '@/components/CountUp'
import { Directory } from '@/components/Directory'
import { LiveCard } from '@/components/LiveCard'
import { LiveTicker } from '@/components/LiveTicker'
import { RefreshStatus } from '@/components/RefreshStatus'
import { SectionHeading } from '@/components/SectionHeading'
import { getLiveSnapshot } from '@/lib/live'
import { streamers } from '@/lib/streamers'
import { PLATFORM_LABELS, type LiveStream } from '@/lib/types'

export const revalidate = 60

const REPO_URL = 'https://github.com/glrodasz/awesome-estreamers-coders'
const ADD_CHANNEL_URL = `${REPO_URL}/edit/master/streamers.yml`

function proposeUrl(stream: LiveStream) {
  const params = new URLSearchParams({
    title: `Proponer: ${stream.channelName} (${PLATFORM_LABELS[stream.platform]})`,
    body: `Canal: ${stream.url}\n\nLo vi en vivo en la sección "Descubre" de la landing.`,
  })
  return `${REPO_URL}/issues/new?${params}`
}

const HERO_STICKERS = [
  { label: 'Twitch', className: 'bg-twitch text-white [--tilt:-8deg]' },
  { label: 'YouTube', className: 'bg-youtube text-white [--tilt:5deg] translate-x-10' },
  { label: 'Kick', className: 'bg-kick text-black [--tilt:-3deg] -translate-x-6' },
]

export default async function Home() {
  const snapshot = await getLiveSnapshot()
  const liveNames = [...new Set(snapshot.live.flatMap((stream) => stream.streamerNames))]
  const countryCount = new Set(streamers.map((s) => s.country)).size

  const stats = [
    { value: liveNames.length, label: 'en vivo ahora', className: liveNames.length ? 'bg-live text-white' : '' },
    { value: streamers.length, label: 'streamers', className: '' },
    { value: countryCount, label: 'países', className: '' },
  ]

  return (
    <div className="overflow-x-clip">
      <header className="scroll-border sticky top-0 z-40 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#" className="font-mono text-sm font-bold">
            &lt;EStreamers Coders /&gt;<span className="caret">_</span>
          </a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="chip px-3 py-1 font-mono text-xs">
            GitHub ↗
          </a>
        </div>
      </header>

      <section className="dots">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-8">
            <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Programación en vivo,{' '}
              <span className="marker sticker mt-2 rounded-2xl px-4 pb-1 text-black [--tilt:-2deg]">en español.</span>
            </h1>
            <p className="max-w-2xl text-lg font-medium text-muted sm:text-xl">
              Un directorio curado por la comunidad de quienes enseñan a programar en Twitch, YouTube y Kick. Mira quién está transmitiendo ahora mismo.
            </p>
            <ul className="grid max-w-xl grid-cols-3 gap-3 sm:gap-5">
              {stats.map((stat) => (
                <li key={stat.label} className={`brutal-sm flex flex-col px-3 py-3 sm:px-5 ${stat.className}`}>
                  <CountUp value={stat.value} className="font-mono text-3xl font-bold sm:text-5xl" />
                  <span className="text-xs font-semibold sm:text-sm">{stat.label}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4">
              <a href="#en-vivo" className="brutal press group bg-accent px-6 py-3 font-bold text-black">
                Ver quién está en vivo{' '}
                <span className="inline-block transition-transform group-hover:translate-y-0.5" aria-hidden>↓</span>
              </a>
              <a href={ADD_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="brutal press group px-6 py-3 font-bold">
                Agrega tu canal{' '}
                <span className="inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>↗</span>
              </a>
            </div>
          </div>

          <div aria-hidden className="hidden flex-col items-center gap-6 pr-8 lg:flex">
            {HERO_STICKERS.map((sticker) => (
              <span key={sticker.label} className={`sticker wobble cursor-default px-8 py-3 text-4xl font-extrabold ${sticker.className}`}>
                {sticker.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <LiveTicker live={snapshot.live} streamerCount={streamers.length} countryCount={countryCount} />

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pb-24 pt-20 sm:px-6">
        <section id="en-vivo" aria-labelledby="en-vivo-titulo" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading id="en-vivo-titulo" index="01" title="En vivo ahora" aside={<RefreshStatus generatedAt={snapshot.generatedAt} />} />
          {snapshot.issues.length > 0 && (
            <p className="brutal-sm bg-accent px-4 py-3 font-mono text-sm text-black">
              ⚠ Estado no disponible por ahora para: {snapshot.issues.map((issue) => PLATFORM_LABELS[issue.platform]).join(', ')}.
            </p>
          )}
          {snapshot.live.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.live.map((stream) => (
                <LiveCard key={stream.url} stream={stream} streamerNames={stream.streamerNames} />
              ))}
            </div>
          ) : (
            <p className="dashed-box">📡 Nadie de la lista está en vivo en este momento. Revisa Descubre o el directorio.</p>
          )}
        </section>

        <section id="descubre" aria-labelledby="descubre-titulo" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading
            id="descubre-titulo"
            index="02"
            title="Descubre"
            description="Streams en español de programación y tecnología en Twitch y Kick que todavía no están en la lista."
          />
          {snapshot.discover.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.discover.slice(0, 6).map((stream) => (
                <LiveCard
                  key={stream.url}
                  stream={stream}
                  footer={
                    <a
                      href={proposeUrl(stream)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/propose flex items-center justify-between font-mono text-xs font-bold uppercase text-black dark:text-ink"
                    >
                      ¿Debería estar en la lista?
                      <span className="transition-transform group-hover/propose:translate-x-1">Proponer →</span>
                    </a>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="dashed-box">🔭 No encontramos otros streams en español de estas categorías ahora mismo.</p>
          )}
        </section>

        <section id="directorio" aria-labelledby="directorio-titulo" className="flex scroll-mt-24 flex-col gap-8">
          <SectionHeading id="directorio-titulo" index="03" title="Directorio" />
          <Directory streamers={streamers} liveNames={liveNames} />
        </section>
      </main>

      <footer className="border-t-3 border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            ¿Enseñas a programar
            <br />
            en vivo?
          </p>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <a href={ADD_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="brutal press border-paper bg-accent px-6 py-3 font-bold text-black [--hover-shadow:var(--paper)] [--shadow-color:var(--paper)]">
              Agrega tu canal ↗
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline underline-offset-4 opacity-80 hover:opacity-100">
              Hecho por la comunidad · awesome-estreamers-coders
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
