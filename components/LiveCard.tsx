import Image from 'next/image'
import type { ReactNode } from 'react'
import { formatViewers } from '@/lib/format'
import type { LiveStream } from '@/lib/types'
import { PlatformBadge } from './PlatformBadge'
import { TimeAgo } from './TimeAgo'

type Props = {
  stream: LiveStream
  /** Curated streamer names for this channel; falls back to the channel name. */
  streamerNames?: string[]
  footer?: ReactNode
}

export function LiveCard({ stream, streamerNames = [], footer }: Props) {
  const name = streamerNames.length ? streamerNames.join(' · ') : stream.channelName

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <a href={stream.url} target="_blank" rel="noopener noreferrer" className="group flex flex-1 flex-col">
        <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
          {stream.thumbnail && (
            <Image
              src={stream.thumbnail}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:opacity-90"
            />
          )}
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            En vivo
          </span>
          {stream.viewers !== null && (
            <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-0.5 text-xs font-medium text-white">
              {formatViewers(stream.viewers)} espectadores
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={stream.platform} />
            <h3 className="truncate font-semibold">{name}</h3>
          </div>
          <p className="line-clamp-2 text-sm text-zinc-700 group-hover:underline dark:text-zinc-300">
            {stream.title || 'Sin título'}
          </p>
          <p className="mt-auto text-xs text-zinc-500 dark:text-zinc-400">
            {stream.category && <span>{stream.category}</span>}
            {stream.category && stream.startedAt && <span aria-hidden> · </span>}
            {stream.startedAt && (
              <span>
                Inició <TimeAgo date={stream.startedAt} />
              </span>
            )}
          </p>
        </div>
      </a>
      {footer && <div className="border-t border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">{footer}</div>}
    </article>
  )
}
