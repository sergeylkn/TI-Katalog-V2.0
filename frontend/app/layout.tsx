import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Navbar } from '@/components/Navbar'
import { ChatWidget } from '@/components/ChatWidget'

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' })

export const metadata: Metadata = {
  title: 'TI-Katalog AI',
  description: 'Інтелектуальна платформа пошуку промислового обладнання',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
            <footer style={{
              borderTop: '1px solid var(--border)', padding: '18px 16px',
              textAlign: 'center', fontSize: '13px', color: 'var(--text-3)',
            }}>
              © 2025 TI-Katalog AI · 189 промислових каталогів
            </footer>
          </div>
          <ChatWidget />
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: 'var(--bg-card)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '12px',
            },
          }} />
        </ThemeProvider>
      </body>
    </html>
  )
}
