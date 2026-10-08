'use client'

import { useSyncExternalStore } from 'react'
import { formatDate, formatRelative } from '@/lib/format'

const TICK_MS = 30_000

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS)
  return () => clearInterval(id)
}

const getNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS
const getServerNow = () => null

/** Relative time ("hace 5 minutos", or "hace 5 min" with `short`); the server renders the absolute date. */
export function TimeAgo({ date, short = false }: { date: string; short?: boolean }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow)
  return (
    <time dateTime={date} title={formatDate(date)}>
      {now === null ? formatDate(date) : formatRelative(date, now, short)}
    </time>
  )
}
