import type { CSSProperties } from 'react'

/** Animated number (CSS @property counter) with the real value kept for assistive tech. */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span className="count-up" style={{ '--target': value } as CSSProperties} aria-hidden />
      <span className="sr-only">{value}</span>
    </span>
  )
}
