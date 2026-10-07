import Image from 'next/image'
import type { ReactNode } from 'react'
import { formatViewers } from '@/lib/format'
import type { LiveStream, Platform } from '@/lib/types'
import { PlatformBadge } from './PlatformBadge'
import { TimeAgo } from './TimeAgo'

type Props = {
  stream: LiveStream
  /** Curated streamer names for this channel; falls back to the channel name. */
  streamerNames?: string[]
  footer?: ReactNode
}

const HOVER_SHADOW: Record<Platform, string> = {
  twitch: '[--hover-shadow:var(--color-twitch)]',
  youtube: '[--hover-shadow:var(--color-youtube)]',
  kick: '[--hover-shadow:var(--color-kick)]',
}

export function LiveCard({ stream, streamerNames = [], footer }: Props) {
  const name = streamerNames.length ? streamerNames.join(' · ') : stream.channelName

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
          {stream.viewers !== null && (
            <span className="absolute bottom-3 left-3 rounded-md border-2 border-[#0b0b0b] bg-[#0b0b0b] px-2 py-0.5 font-mono text-xs font-bold text-white">
              {formatViewers(stream.viewers)} viendo
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={stream.platform} />
            <h3 className="truncate text-lg font-extrabold">{name}</h3>
          </div>
          <p className="line-clamp-2 font-medium">{stream.title || 'Sin título'}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-2 font-mono text-xs text-muted">
            <p>
              {stream.category && <span>{stream.category}</span>}
              {stream.category && stream.startedAt && <span aria-hidden> · </span>}
              {stream.startedAt && (
                <span>
                  Inició <TimeAgo date={stream.startedAt} />
                </span>
              )}
            </p>
            <span className="shrink-0 font-bold text-ink transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
              Ver →
            </span>
          </div>
        </div>
      </a>
      {footer && <div className="border-t-3 border-ink bg-accent/40 px-4 py-2.5">{footer}</div>}
    </article>
  )
}
