'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
import { Search, Moon, Sun, Settings, BookOpen, Zap, Menu, X } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { catalogApi } from '@/lib/api'
import debounce from 'debounce'
import { clsx } from 'clsx'

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, toggle } = useTheme()
  const [q, setQ]                   = useState('')
  const [suggests, setSuggests]     = useState<string[]>([])
  const [showDrop, setShowDrop]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const fetchSuggest = useCallback(
    debounce(async (v: string) => {
      if (v.length < 2) { setSuggests([]); return }
      try {
        const { suggestions } = await catalogApi.suggest(v)
        setSuggests(suggestions)
        setShowDrop(suggestions.length > 0)
      } catch { setSuggests([]) }
    }, 300), []
  )

  const links = [
    { href: '/',       label: 'Розділи',  Icon: BookOpen },
    { href: '/search', label: 'AI Пошук', Icon: Zap },
    { href: '/admin',  label: 'Адмін',    Icon: Settings },
  ]
  const active = (h: string) => h === '/' ? pathname === '/' : pathname.startsWith(h)

  const go = (v: string) => {
    router.push(`/search?q=${encodeURIComponent(v)}`)
    setQ(''); setShowDrop(false)
  }

  return (
    <header style={{
      position:'sticky', top:0, zIndex:50,
      background:'rgba(12,14,24,.85)', backdropFilter:'blur(16px)',
      borderBottom:'1px solid var(--border)',
    }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', height:60, gap:16 }}>

          {/* Logo */}
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, color:'var(--text)', textDecoration:'none', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14 }}>К</div>
            <span style={{ fontWeight:600, fontSize:14, display: 'none' }} className="sm:block">Технічний Каталог</span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display:'flex', gap:4 }} className="hidden md:flex">
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} style={{
                display:'flex', alignItems:'center', gap:6, padding:'7px 12px',
                borderRadius:8, fontSize:14, fontWeight:500, textDecoration:'none',
                color: active(href) ? 'var(--text)' : 'var(--text-2)',
                background: active(href) ? 'var(--bg-hover)' : 'transparent',
                transition:'all .15s',
              }}>
                <Icon size={14} />{label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div style={{ flex:1, maxWidth:400, marginLeft:'auto', position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); fetchSuggest(e.target.value) }}
              onFocus={() => suggests.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => e.key === 'Enter' && q.trim() && go(q.trim())}
              placeholder="Пошук…"
              className="input"
              style={{ paddingLeft:36, height:36, borderRadius:99, fontSize:13 }}
            />
            {showDrop && suggests.length > 0 && (
              <div ref={dropRef} className="card anim-scale" style={{
                position:'absolute', top:'calc(100% + 6px)', left:0, right:0,
                zIndex:100, overflow:'hidden', padding:'4px 0',
              }}>
                {suggests.map((s, i) => (
                  <button key={i} onMouseDown={() => go(s)} style={{
                    width:'100%', textAlign:'left', padding:'9px 14px', fontSize:13,
                    background:'transparent', border:'none', cursor:'pointer',
                    color:'var(--text-2)', display:'flex', alignItems:'center', gap:8,
                    transition:'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Search size={12} style={{ color:'var(--text-3)', flexShrink:0 }} />{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme */}
          <button onClick={toggle} className="btn btn-ghost btn-icon" title="Тема">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Mobile toggle */}
          <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden anim-up" style={{ paddingBottom:12, borderTop:'1px solid var(--border)' }}>
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                borderRadius:8, fontSize:14, color: active(href) ? 'var(--text)' : 'var(--text-2)',
                background: active(href) ? 'var(--bg-hover)' : 'transparent', textDecoration:'none',
              }}>
                <Icon size={14} />{label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
