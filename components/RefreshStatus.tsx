'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useTransition } from 'react'
import { TimeAgo } from './TimeAgo'

const REFRESH_MS = 60_000

/**
 * Re-fetches the server-rendered page every minute while the tab is visible,
 * and lets people refresh by hand with a spinner while it loads.
 */
export function RefreshStatus({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router])

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
