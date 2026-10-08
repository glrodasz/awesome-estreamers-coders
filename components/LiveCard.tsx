import Image from 'next/image'
import type { ReactNode } from 'react'
import { formatViewers } from '@/lib/format'
import { PLATFORM_LABELS, type LiveStream, type Platform, type PlatformStream } from '@/lib/types'
import { PlatformBadge } from './PlatformBadge'
import { TimeAgo } from './TimeAgo'

type Props = {
  stream: LiveStream
  /** Every platform the streamer is live on, in priority order; defaults to the stream's own. */
  platforms?: PlatformStream[]
  /** Curated streamer names for this channel; falls back to the channel name. */
  streamerNames?: string[]
  footer?: ReactNode
}

const HOVER_SHADOW: Record<Platform, string> = {
  twitch: '[--hover-shadow:var(--color-twitch)]',
  youtube: '[--hover-shadow:var(--color-youtube)]',
  kick: '[--hover-shadow:var(--color-kick)]',
}

const DOT: Record<Platform, string> = {
  twitch: 'bg-twitch',
  youtube: 'bg-youtube',
  kick: 'bg-kick',
}

export function LiveCard({ stream, platforms = [stream], streamerNames = [], footer }: Props) {
  const name = streamerNames.length ? streamerNames.join(' · ') : stream.channelName
  const isSimulcast = platforms.length > 1
  const withViewers = platforms.filter((p): p is PlatformStream & { viewers: number } => p.viewers !== null)

  return (
    <article className={`reveal brutal press group flex flex-col overflow-hidden ${HOVER_SHADOW[stream.platform]}`}>
      <a href={stream.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col focus-visible:outline-offset-[-6px]">
        <div className="relative aspect-video overflow-hidden border-b-3 border-ink bg-ink/10">
          {stream.thumbnail && (
            <Image
              src={stream.thumbnail}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          )}
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-md border-2 border-[#0b0b0b] bg-live px-2 py-0.5 font-mono text-xs font-bold uppercase text-white shadow-[3px_3px_0_0_#0b0b0b]">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            En vivo
          </span>
          {withViewers.length > 0 && (
            <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border-2 border-[#0b0b0b] bg-[#0b0b0b] px-2 py-0.5 font-mono text-xs font-bold text-white">
              {isSimulcast
                ? withViewers.map((p) => (
                    <span key={p.url} className="flex items-center gap-1">
                      <span className={`size-2 rounded-sm ${DOT[p.platform]}`} aria-hidden />
                      <span className="sr-only">{PLATFORM_LABELS[p.platform]}:</span>
                      {formatViewers(p.viewers)}
                    </span>
                  ))
                : formatViewers(withViewers[0].viewers)}{' '}
              viendo
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 px-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {[...new Set(platforms.map((p) => p.platform))].map((platform) => (
              <PlatformBadge key={platform} platform={platform} />
            ))}
            <h3 className="min-w-0 truncate text-lg font-extrabold">{name}</h3>
          </div>
          <p className="line-clamp-2 font-medium">{stream.title || 'Sin título'}</p>
        </div>
      </a>
      <div
        className={`flex gap-3 px-4 pb-4 pt-4 font-mono text-xs text-muted ${isSimulcast ? 'flex-col' : 'items-end justify-between'}`}
      >
        <div className="flex flex-col gap-1">
          {stream.category && <p>{stream.category}</p>}
          {stream.startedAt && (
            <p>
              Inició <TimeAgo date={stream.startedAt} />
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-4 gap-y-1">
          {isSimulcast && <span>Ver en</span>}
          {platforms.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver en ${PLATFORM_LABELS[p.platform]}`}
              className="group/ver font-bold text-ink"
            >
              {isSimulcast ? PLATFORM_LABELS[p.platform] : `Ver en ${PLATFORM_LABELS[p.platform]}`}{' '}
              <span className="inline-block transition-transform duration-200 group-hover/ver:translate-x-1" aria-hidden>
                →
              </span>
            </a>
          ))}
        </div>
      </div>
      {footer && <div className="border-t-3 border-ink bg-accent/40 px-4 py-2.5">{footer}</div>}
    </article>
  )
}
