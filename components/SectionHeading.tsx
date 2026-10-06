import type { ReactNode } from 'react'

type Props = {
  id: string
  index: string
  title: string
  description?: string
  aside?: ReactNode
}

export function SectionHeading({ id, index, title, description, aside }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-3 border-ink pb-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
          <span className="rounded-md bg-ink px-2 py-1 font-mono text-sm text-paper">{index}</span>
          {title}
        </h2>
        {description && <p className="max-w-2xl text-muted">{description}</p>}
      </div>
      {aside}
    </div>
  )
}
