import { AutoRefresh } from '@/components/AutoRefresh'
import { Directory } from '@/components/Directory'
import { LiveCard } from '@/components/LiveCard'
import { TimeAgo } from '@/components/TimeAgo'
import { getLiveSnapshot } from '@/lib/live'
import { streamers } from '@/lib/streamers'
import { PLATFORM_LABELS, type LiveStream } from '@/lib/types'

export const revalidate = 60

const REPO_URL = 'https://github.com/glrodasz/awesome-estreamers-coders'
const ADD_CHANNEL_URL = `${REPO_URL}/edit/master/data.json`

function proposeUrl(stream: LiveStream) {
  const params = new URLSearchParams({
    title: `Proponer: ${stream.channelName} (${PLATFORM_LABELS[stream.platform]})`,
    body: `Canal: ${stream.url}\n\nLo vi en vivo en la sección "Descubre" de la landing.`,
  })
  return `${REPO_URL}/issues/new?${params}`
}

const buttonBase = 'rounded-full px-5 py-2.5 text-sm font-semibold transition'

export default async function Home() {
  const snapshot = await getLiveSnapshot()
  const liveNames = [...new Set(snapshot.live.flatMap((stream) => stream.streamerNames))]
  const countryCount = new Set(streamers.map((s) => s.country)).size

  return (
    <>
      <AutoRefresh />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-mono text-sm font-bold">&lt;EStreamers Coders /&gt;</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          GitHub ↗
        </a>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-16 sm:px-6">
        <section className="flex flex-col gap-6 pt-8 sm:pt-16">
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            Programación en vivo, <span className="text-twitch">en español</span>.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Un directorio curado por la comunidad de quienes enseñan a programar en Twitch, YouTube y Kick. Mira quién está transmitiendo ahora mismo.
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <li>
              <strong className="text-2xl text-red-600">{liveNames.length}</strong> en vivo ahora
            </li>
            <li>
              <strong className="text-2xl">{streamers.length}</strong> streamers
            </li>
            <li>
              <strong className="text-2xl">{countryCount}</strong> países
            </li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <a href="#en-vivo" className={`${buttonBase} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300`}>
              Ver quién está en vivo
            </a>
            <a href={ADD_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={`${buttonBase} border border-zinc-300 hover:border-zinc-500 dark:border-zinc-700`}>
              Agrega tu canal
            </a>
          </div>
        </section>

        <section id="en-vivo" aria-labelledby="en-vivo-titulo" className="flex scroll-mt-8 flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="en-vivo-titulo" className="text-2xl font-bold">🔴 En vivo ahora</h2>
            <p className="text-sm text-zinc-500">
              Actualizado <TimeAgo date={snapshot.generatedAt} />
            </p>
          </div>
          {snapshot.issues.length > 0 && (
            <p className="rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Estado no disponible por ahora para: {snapshot.issues.map((issue) => PLATFORM_LABELS[issue.platform]).join(', ')}.
            </p>
          )}
          {snapshot.live.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.live.map((stream) => (
                <LiveCard key={stream.url} stream={stream} streamerNames={stream.streamerNames} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
              Nadie de la lista está en vivo en este momento. Revisa el directorio o la sección Descubre.
            </p>
          )}
        </section>

        <section id="descubre" aria-labelledby="descubre-titulo" className="flex scroll-mt-8 flex-col gap-4">
          <div>
            <h2 id="descubre-titulo" className="text-2xl font-bold">Descubre</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Streams en español de programación y tecnología en Twitch y Kick que todavía no están en la lista.
            </p>
          </div>
          {snapshot.discover.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.discover.slice(0, 6).map((stream) => (
                <LiveCard
                  key={stream.url}
                  stream={stream}
                  footer={
                    <a href={proposeUrl(stream)} target="_blank" rel="noopener noreferrer" className="font-medium text-twitch hover:underline">
                      ¿Debería estar en la lista? Proponer →
                    </a>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
              No encontramos otros streams en español de estas categorías ahora mismo.
            </p>
          )}
        </section>
        <section id="directorio" aria-labelledby="directorio-titulo" className="flex scroll-mt-8 flex-col gap-4">
          <h2 id="directorio-titulo" className="text-2xl font-bold">Directorio</h2>
          <Directory streamers={streamers} liveNames={liveNames} />
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Hecho por la comunidad ·{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          awesome-estreamers-coders
        </a>
      </footer>
    </>
  )
}
