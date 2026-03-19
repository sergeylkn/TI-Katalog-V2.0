'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Moon, Sun, Settings, Zap, Menu, X, ChevronDown, Layers } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { apiService, Section } from '@/lib/api'
import debounce from 'debounce'

export function Navbar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { theme, toggle } = useTheme()

  const [q, setQ]               = useState('')
  const [suggests, setSuggests] = useState<string[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [catOpen, setCatOpen]   = useState(false)
  const [mobile, setMobile]     = useState(false)

  useEffect(() => {
    apiService.getSections().then(setSections).catch(() => {})
  }, [])

  const fetchSug = useCallback(
    debounce(async (v: string) => {
      if (v.length < 2) { setSuggests([]); return }
      try {
        const { suggestions } = await apiService.suggest(v)
        setSuggests(suggestions); setShowDrop(suggestions.length > 0)
      } catch { setSuggests([]) }
    }, 280), []
  )

  const go = (v: string) => {
    router.push(`/search?q=${encodeURIComponent(v)}`)
    setQ(''); setShowDrop(false)
  }

  const active = (h: string) => h === '/' ? pathname === '/' : pathname.startsWith(h)

  const navLinkStyle = (h: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
    borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none',
    color: active(h) ? 'var(--text)' : 'var(--text-2)',
    background: active(h) ? 'var(--bg-hover)' : 'transparent', transition: 'all .15s',
  })

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(11,13,23,.88)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, gap: 12 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>TI</div>
            <span style={{ fontWeight: 700, fontSize: 15 }} className="hidden sm:block">TI-Katalog</span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="hidden md:flex">

            {/* Catalog dropdown */}
            <div style={{ position: 'relative' }} onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button style={{ ...navLinkStyle('/catalog'), border: 'none', cursor: 'pointer' }}>
                <Layers size={14} />Каталог<ChevronDown size={12} style={{ transition: 'transform .2s', transform: catOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {catOpen && sections.length > 0 && (
                <div className="card anim-scale" style={{
                  position: 'absolute', top: '100%', left: 0, minWidth: 280, zIndex: 200,
                  padding: '8px 0', boxShadow: '0 16px 48px rgba(0,0,0,.5)',
                }}>
                  {sections.map(s => (
                    <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`} onClick={() => setCatOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 16px', fontSize: 13, color: 'var(--text-2)',
                        textDecoration: 'none', transition: 'background .1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{s.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {s.document_count}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/search" style={navLinkStyle('/search')}><Zap size={14} />AI Пошук</Link>
            <Link href="/admin"  style={navLinkStyle('/admin')} ><Settings size={14} />Адмін</Link>
          </nav>

          {/* Search bar */}
          <div style={{ flex: 1, maxWidth: 380, marginLeft: 'auto', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input value={q} onChange={e => { setQ(e.target.value); fetchSug(e.target.value) }}
              onFocus={() => suggests.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={e => e.key === 'Enter' && q.trim() && go(q.trim())}
              placeholder="Пошук товарів…"
              className="input" style={{ paddingLeft: 34, height: 36, borderRadius: 99, fontSize: 13 }}
            />
            {showDrop && (
              <div className="card anim-scale" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100, overflow: 'hidden', padding: '4px 0' }}>
                {suggests.map((s, i) => (
                  <button key={i} onMouseDown={() => go(s)} style={{
                    width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Search size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={toggle} className="btn btn-ghost btn-icon" title="Тема">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setMobile(v => !v)}>
            {mobile ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobile && (
          <div className="md:hidden anim-up" style={{ paddingBottom: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '8px 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.07em', paddingLeft: 12 }}>Каталог</div>
            {sections.map(s => (
              <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`} onClick={() => setMobile(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
                {s.name}
              </Link>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
            {[{ href: '/search', label: 'AI Пошук' }, { href: '/admin', label: 'Адмін' }].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobile(false)}
                style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: active(href) ? 'var(--text)' : 'var(--text-2)', background: active(href) ? 'var(--bg-hover)' : 'transparent', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
