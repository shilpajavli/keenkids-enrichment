import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'

export const viewport: Viewport = {
  themeColor: '#B8973A',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'KeenKids Enrichment',
  description: 'Enrichment program portal',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'KeenKids' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
