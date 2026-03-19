'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Zap, FileText, Package, CheckCircle, ChevronRight } from 'lucide-react'
import { apiService, Section, ImportStatus } from '@/lib/api'

const ICONS: Record<string, string> = {
  'манометри':'📊','шланги':'🔌','фітинги':'🔗','насоси':'⚙️',
  'ущільнення':'🛡️','клапани':'🔄','фільтри':'🔍','труби':'📏',
  'кабелі':'⚡','датчики':'📡','інструменти':'🛠️','загальний':'📦',
}
const COLORS = [
  'rgba(61,90,241,.14)','rgba(139,92,246,.14)','rgba(6,182,212,.14)',
  'rgba(34,197,94,.14)','rgba(245,158,11,.14)','rgba(239,68,68,.14)',
  'rgba(99,102,241,.14)','rgba(20,184,166,.14)','rgba(234,179,8,.14)',
  'rgba(14,165,233,.14)',
]

function getIcon(name: string) {
  const l = name.toLowerCase()
  return Object.entries(ICONS).find(([k]) => l.includes(k))?.[1] ?? '📂'
}

export default function Home() {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>([])
  const [status,   setStatus]   = useState<ImportStatus | null>(null)
  const [q, setQ]               = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      apiService.getSections(),
      apiService.importStatus().catch(() => null),
    ]).then(([s, st]) => { setSections(s); setStatus(st); setLoading(false) })
  }, [])

  return (
    <div className="grid-bg" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Hero */}
      <section style={{ padding: '68px 16px 44px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(61,90,241,.14), transparent)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 660, margin: '0 auto', position: 'relative' }}>
          <span className="badge badge-brand anim-up" style={{ marginBottom: 20, display: 'inline-flex' }}>
            <Zap size={11} />189 промислових каталогів · Claude AI
          </span>
          <h1 className="anim-up s1" style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.03em', marginBottom: 14 }}>
            TI-Katalog AI
            <span style={{ display: 'block', color: 'var(--brand-2)' }}>Промислове обладнання</span>
          </h1>
          <p className="anim-up s2" style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Шланги, фітинги, насоси, манометри — семантичний пошук по 189 каталогах з AI-аналізом технічних параметрів
          </p>

          <form className="anim-up s3" onSubmit={e => { e.preventDefault(); q.trim() && router.push(`/search?q=${encodeURIComponent(q.trim())}`) }}
            style={{ position: 'relative', maxWidth: 540, margin: '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Шланг DN65, манометр PN16, фітинг BSP…" className="search-big" />
            <button type="submit" className="btn btn-primary" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', height: 42, borderRadius: 12 }}>
              <Zap size={15} /><span style={{ display: 'none' }} className="sm:inline">Пошук</span>
            </button>
          </form>

          {/* Quick hints */}
          <div className="anim-up s4" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {['Шланг DN65','Манометр PN16','Фітинг BSP 1/2"','Насос 16 bar','Ущільнення PTFE'].map(hint => (
              <button key={hint} onClick={() => router.push(`/search?q=${encodeURIComponent(hint)}`)}
                className="badge badge-muted" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12 }}>
                {hint}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      {status && (
        <div className="anim-up s4" style={{ maxWidth: 860, margin: '0 auto 36px', padding: '0 16px' }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            {[
              { label: 'PDF каталогів', val: status.total || 189, icon: FileText, color: 'var(--brand-2)' },
              { label: 'Оброблено',     val: status.done,         icon: CheckCircle, color: 'var(--green)' },
              { label: 'Розділів',      val: sections.length,     icon: Package, color: '#a78bfa' },
              { label: 'В обробці',     val: status.parsing,      icon: Zap, color: 'var(--yellow)' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid var(--border)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section tree */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Технічні розділи</h2>
          <Link href="/search" style={{ fontSize: 13, color: 'var(--brand-2)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            Всі товари <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)}
          </div>
        ) : sections.length === 0 ? (
          <div className="card" style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📂</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Каталог порожній</h3>
            <p style={{ color: 'var(--text-2)', marginBottom: 22 }}>Перейдіть в адмін-панель та запустіть імпорт PDF</p>
            <Link href="/admin" className="btn btn-primary">⚡ Запустити імпорт</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {sections.map((s, i) => (
              <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`}
                className={`anim-up s${Math.min((i % 6) + 1, 6)}`}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card card-hover" style={{ padding: 18, cursor: 'pointer', height: '100%' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>
                    {getIcon(s.name)}
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{s.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{s.document_count} PDF</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
