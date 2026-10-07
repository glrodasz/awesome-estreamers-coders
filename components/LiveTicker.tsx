import { formatViewers } from '@/lib/format'
import { PLATFORM_LABELS, type CuratedLiveStream } from '@/lib/types'

type Props = {
  live: CuratedLiveStream[]
  streamerCount: number
  countryCount: number
}

const MIN_ITEMS = 8

function tickerItems({ live, streamerCount, countryCount }: Props): string[] {
  const items = live.length
    ? live.map((stream) => {
        const name = stream.streamerNames.join(' · ') || stream.channelName
        const viewers = stream.viewers === null ? '' : ` · ${formatViewers(stream.viewers)} viendo`
        return `${name} en ${PLATFORM_LABELS[stream.platform]}${viewers}`
      })
    : ['Twitch', 'YouTube', 'Kick', `${streamerCount} streamers`, `${countryCount} países`, 'Programación en español']

  const repeated = [...items]
  while (repeated.length < MIN_ITEMS) repeated.push(...items)
  return repeated
}

/** Decorative marquee band; the same information is in the cards below. */
export function LiveTicker(props: Props) {
  const items = tickerItems(props)
  const isLive = props.live.length > 0

  return (
    <div aria-hidden className="ticker relative left-1/2 z-10 w-[120vw] -translate-x-1/2 -rotate-1 border-y-3 border-ink bg-ink py-3 text-paper">
      <div className="ticker-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-3 px-6 font-mono text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                <span className={`size-2.5 rounded-full ${isLive ? 'bg-live' : 'bg-accent'}`} />
                {isLive && <span className="text-live">En vivo</span>}
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
