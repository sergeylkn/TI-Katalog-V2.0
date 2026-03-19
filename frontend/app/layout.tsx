import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Navbar } from '@/components/Navbar'
import { ChatWidget } from '@/components/ChatWidget'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Технічний Каталог AI',
  description: 'Інтелектуальна платформа пошуку по технічних каталогах з AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer style={{ borderTop: '1px solid var(--border)', padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-3)' }}>
              © 2025 Технічний Каталог AI
            </footer>
          </div>
          <ChatWidget />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '12px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
