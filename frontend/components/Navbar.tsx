'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Settings, Layers, ChevronDown, X, Menu } from 'lucide-react'
import { apiService, Section } from '@/lib/api'

export function Navbar() {
  const path = usePathname()
  const [sections, setSections] = useState<Section[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => { apiService.getSections().then(setSections).catch(() => {}) }, [])

  const nav: React.CSSProperties = {
    position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15,17,23,.95)',
    backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)',
  }
  const lnk = (p: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px',
    borderRadius: 7, fontSize: 13, fontWeight: 500, textDecoration: 'none',
    color: path === p ? 'var(--text)' : 'var(--text-2)',
    background: path === p ? 'var(--bg-hover)' : 'transparent',
    cursor: 'pointer', border: 'none',
  })

  return (
    <nav style={nav}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 52, gap: 4 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff' }}>TI</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>TI-Katalog</span>
        </Link>

        <div className="hidden md:flex" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Catalog dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setCatOpen(v => !v)} style={{ ...lnk('/catalog'), display: 'inline-flex' }}>
              <Layers size={13} /> Каталог <ChevronDown size={11} />
            </button>
            {catOpen && sections.length > 0 && (
              <div className="card" style={{ position: 'absolute', top: '100%', left: 0, minWidth: 260, zIndex: 200, padding: '4px 0', marginTop: 4 }}>
                {sections.map(s => (
                  <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`} onClick={() => setCatOpen(false)}
                    style={{ display: 'block', padding: '8px 14px', fontSize: 12, color: 'var(--text-2)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color='var(--text)', e.currentTarget.style.background='var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.color='var(--text-2)', e.currentTarget.style.background='transparent')}>
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/search" style={lnk('/search')}><Search size={13} /> Пошук</Link>
          <Link href="/admin"  style={lnk('/admin')}><Settings size={13} /> Адмін</Link>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button className="md:hidden" onClick={() => setMobile(v => !v)} style={{ ...lnk(''), padding: '6px' }}>
            {mobile ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {mobile && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 12px' }}>
          <Link href="/"       onClick={() => setMobile(false)} style={{ ...lnk('/'), display: 'flex', marginBottom: 4 }}>Головна</Link>
          <Link href="/search" onClick={() => setMobile(false)} style={{ ...lnk('/search'), display: 'flex', marginBottom: 4 }}><Search size={13} /> Пошук</Link>
          <Link href="/admin"  onClick={() => setMobile(false)} style={{ ...lnk('/admin'),  display: 'flex' }}><Settings size={13} /> Адмін</Link>
        </div>
      )}
    </nav>
  )
}
