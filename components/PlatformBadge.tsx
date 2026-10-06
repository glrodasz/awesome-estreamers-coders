import { PLATFORM_LABELS, type Platform } from '@/lib/types'

const STYLES: Record<Platform, string> = {
  twitch: 'bg-twitch text-white',
  youtube: 'bg-youtube text-white',
  kick: 'bg-kick text-black',
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STYLES[platform]}`}>
      {PLATFORM_LABELS[platform]}
    </span>
  )
}
