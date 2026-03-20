'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, FileText, Layers, Zap } from 'lucide-react'
import { apiService, Section } from '@/lib/api'

export default function HomePage() {
  const [sections, setSections] = useState<Section[]>([])
  const [stats, setStats] = useState<{total:number,products:number} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiService.getSections(), apiService.importStatus()])
      .then(([secs, st]) => { setSections(secs); setStats({total: st.total, products: st.products}) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(61,107,250,.12)', border: '1px solid rgba(61,107,250,.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: 'var(--brand)', marginBottom: 20 }}>
          <Zap size={11} /> AI-powered catalog
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 14, background: 'var(--brand-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TI-Katalog
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16, marginBottom: 28 }}>
          Промисловий каталог — {stats?.total ?? '…'} PDF, {stats?.products ?? '…'} товарів
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/search" className="btn btn-primary" style={{ fontSize: 14, padding: '10px 22px' }}>
            <Search size={15} /> AI Пошук
          </Link>
          <Link href="/admin" className="btn btn-ghost" style={{ fontSize: 14, padding: '10px 22px' }}>
            <FileText size={15} /> Адмін
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} style={{ color: 'var(--brand)' }} /> Розділи каталогу
        </h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {Array.from({length: 8}).map((_,i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {sections.map((s, i) => (
              <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`} style={{ textDecoration: 'none' }}>
                <div className={`card card-hover anim-up s${Math.min((i%6)+1,6)}`} style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.document_count} документів</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
