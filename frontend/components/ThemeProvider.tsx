'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    const t = (localStorage.getItem('theme') as Theme) || 'dark'
    setTheme(t)
    document.documentElement.classList.toggle('light', t === 'light')
  }, [])
  const toggle = () => {
    setTheme(p => {
      const n = p === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', n)
      document.documentElement.classList.toggle('light', n === 'light')
      return n
    })
  }
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
