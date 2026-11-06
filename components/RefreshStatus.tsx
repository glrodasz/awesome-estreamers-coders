'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'
import { TimeAgo } from './TimeAgo'

// While the tab stays open, ask for fresh data at most this often (on top of the catch-up below).
const REFRESH_MS = 5 * 60_000
// How often to check whether the tab is due for that refresh; the check itself makes no request.
const CHECK_MS = 30_000
// Matches the page's `revalidate`: older than this, the HTML came from the ISR cache while it regenerates.
const STALE_MS = 60_000
// Gives the background regeneration time to finish before asking for the page again.
const CATCH_UP_DELAY_MS = 3_000
// The regenerated page can still carry stale upstream data from the Data Cache, so allow one more try.
const MAX_CATCH_UP_REFRESHES = 2

const snapshotAgeMs = (generatedAt: string) => Date.now() - new Date(generatedAt).getTime()

/**
 * Re-fetches the server-rendered page every five minutes while the tab is visible
 * (and on return to the tab once that long has passed), catches up after any refresh
 * that still returns a stale cached page, and lets people refresh by hand.
 */
export function RefreshStatus({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const lastRefreshAt = useRef(0)
  const refresh = useCallback(() => {
    lastRefreshAt.current = Date.now()
    startTransition(() => router.refresh())
  }, [router])
  const catchUpRefreshes = useRef(0)

  // Runs on load and whenever a refresh finishes, even when it returns the same stale snapshot.
  useEffect(() => {
    if (isPending) return
    const ageMs = snapshotAgeMs(generatedAt)
    const isStale = ageMs > STALE_MS
    console.debug(`[RefreshStatus] snapshot ${Math.round(ageMs / 1000)}s old (${generatedAt})${isStale ? ', stale' : ''}`)
    if (!isStale) {
      catchUpRefreshes.current = 0
      return
    }
    if (catchUpRefreshes.current >= MAX_CATCH_UP_REFRESHES) return
    const id = setTimeout(() => {
      catchUpRefreshes.current += 1
      refresh()
    }, CATCH_UP_DELAY_MS)
    return () => clearTimeout(id)
  }, [generatedAt, isPending, refresh])

  useEffect(() => {
    // The page load counts as the first refresh.
    lastRefreshAt.current = Date.now()
    const refreshIfDue = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefreshAt.current >= REFRESH_MS) refresh()
    }
    const id = setInterval(refreshIfDue, CHECK_MS)
    document.addEventListener('visibilitychange', refreshIfDue)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refreshIfDue)
    }
  }, [refresh])

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-muted" aria-live="polite" data-generated-at={generatedAt}>
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
