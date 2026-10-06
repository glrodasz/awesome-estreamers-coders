import type { Metadata } from 'next'
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

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
    <html lang="es" className={`${bricolage.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
