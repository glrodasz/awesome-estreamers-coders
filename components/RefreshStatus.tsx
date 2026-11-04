'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'
import { TimeAgo } from './TimeAgo'

const REFRESH_MS = 60_000
// Matches the page's `revalidate`: older than this, the HTML came from the ISR cache while it regenerates.
const STALE_MS = 60_000
// Gives the background regeneration time to finish before asking for the page again.
const CATCH_UP_DELAY_MS = 3_000
// The regenerated page can still carry stale upstream data from the Data Cache, so allow one more try.
const MAX_CATCH_UP_REFRESHES = 2

/**
 * Re-fetches the server-rendered page every minute while the tab is visible,
 * catches up right after load when the cached page is stale,
 * and lets people refresh by hand with a spinner while it loads.
 */
export function RefreshStatus({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router])
  const catchUpRefreshes = useRef(0)

  useEffect(() => {
    const isStale = Date.now() - new Date(generatedAt).getTime() > STALE_MS
    if (!isStale || catchUpRefreshes.current >= MAX_CATCH_UP_REFRESHES) return
    const id = setTimeout(() => {
      catchUpRefreshes.current += 1
      refresh()
    }, CATCH_UP_DELAY_MS)
    return () => clearTimeout(id)
  }, [generatedAt, refresh])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const id = setInterval(refreshIfVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [refresh])

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-muted" aria-live="polite">
      <span>{isPending ? 'Actualizando…' : <>Actualizado <TimeAgo date={generatedAt} /></>}</span>
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        aria-label="Actualizar ahora"
        className="chip group grid size-9 place-items-center text-ink disabled:cursor-wait"
      >
        <svg
          viewBox="0 0 24 24"
          className={`size-4 transition-transform duration-300 ${isPending ? 'animate-spin' : 'group-hover:rotate-180'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>
  )
}
