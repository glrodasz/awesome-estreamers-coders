import type { Metadata } from 'next'
import './globals.css'

const description =
  'Directorio curado de streamers que enseñan programación en español. Mira quién está en vivo ahora en Twitch, YouTube y Kick.'

export const metadata: Metadata = {
  title: 'EStreamers Coders — Programación en vivo en español',
  description,
  openGraph: {
    title: 'EStreamers Coders',
    description,
    type: 'website',
    locale: 'es_ES',
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
