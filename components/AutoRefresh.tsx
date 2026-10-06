'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const REFRESH_MS = 60_000

/** Re-fetches the server-rendered page every minute while the tab is visible. */
export function AutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const id = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router])

  return null
}
