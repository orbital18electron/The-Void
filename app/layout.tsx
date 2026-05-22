import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Void — 2AM Journal',
  description: 'Type your thoughts into the void. They disappear.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
