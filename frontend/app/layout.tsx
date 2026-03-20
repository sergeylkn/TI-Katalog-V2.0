import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { ChatWidget } from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'TI-Katalog AI',
  description: 'Промисловий каталог з AI пошуком',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <footer style={{ borderTop: '1px solid var(--border)', padding: '14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>
          TI-Katalog AI v3.0 — 189 PDF каталогів
        </footer>
        <ChatWidget />
      </body>
    </html>
  )
}
