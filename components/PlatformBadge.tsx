import { PLATFORM_LABELS, type Platform } from '@/lib/types'

const STYLES: Record<Platform, string> = {
  twitch: 'bg-twitch text-white',
  youtube: 'bg-youtube text-white',
  kick: 'bg-kick text-black',
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`shrink-0 rounded-md border-2 border-[#0b0b0b] px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide ${STYLES[platform]}`}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  )
}
