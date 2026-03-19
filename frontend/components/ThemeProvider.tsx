'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type T = 'dark' | 'light'
const Ctx = createContext<{ theme: T; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<T>('dark')
  useEffect(() => {
    const t = (localStorage.getItem('theme') as T) || 'dark'
    set(t); document.documentElement.classList.toggle('light', t === 'light')
  }, [])
  const toggle = () => set(p => {
    const n = p === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', n)
    document.documentElement.classList.toggle('light', n === 'light')
    return n
  })
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
