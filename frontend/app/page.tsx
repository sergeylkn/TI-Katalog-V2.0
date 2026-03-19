'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Zap, FileText, Package, CheckCircle, Layers, ChevronRight } from 'lucide-react'
import { catalogApi, Section, ImportStatus } from '@/lib/api'

const ICONS: Record<string,string> = { 'електрик':'⚡','освітлен':'💡','кабел':'🔌','вимикач':'🔲','щит':'🗂️','труб':'🔧','інструм':'🛠️','датчик':'📡','з\'єднув':'🔗','захист':'🛡️' }
const COLORS = ['rgba(69,97,248,.15)','rgba(139,92,246,.15)','rgba(6,182,212,.15)','rgba(34,197,94,.15)','rgba(245,158,11,.15)','rgba(239,68,68,.15)','rgba(99,102,241,.15)','rgba(20,184,166,.15)','rgba(234,179,8,.15)','rgba(14,165,233,.15)']

function getIcon(name: string) {
  const l = name.toLowerCase()
  return Object.entries(ICONS).find(([k]) => l.includes(k))?.[1] ?? '📂'
}

export default function Home() {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>([])
  const [status, setStatus]     = useState<ImportStatus|null>(null)
  const [q, setQ]               = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([catalogApi.getSections(), catalogApi.importStatus().catch(()=>null)])
      .then(([s, st]) => { setSections(s); setStatus(st); setLoading(false) })
  }, [])

  return (
    <div className="grid-bg" style={{ minHeight:'calc(100vh - 120px)' }}>
      {/* Hero */}
      <section style={{ padding:'72px 16px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(69,97,248,.15), transparent)', pointerEvents:'none' }} />
        <div style={{ maxWidth:680, margin:'0 auto', position:'relative' }}>
          <span className="badge badge-brand anim-up" style={{ marginBottom:20, display:'inline-flex' }}>
            <Zap size={11} />AI-powered · Claude
          </span>

          <h1 className="anim-up s1" style={{ fontSize:'clamp(2rem,5vw,3.2rem)', fontWeight:800, lineHeight:1.15, letterSpacing:'-.03em', marginBottom:16 }}>
            Технічний Каталог
            <span style={{ display:'block', color:'var(--brand-2)' }}>AI Платформа</span>
          </h1>

          <p className="anim-up s2" style={{ fontSize:16, color:'var(--text-2)', marginBottom:36, maxWidth:500, margin:'0 auto 36px' }}>
            Пошук по тисячам товарів з AI-аналізом. Завантажуйте PDF каталоги, знаходьте продукцію миттєво.
          </p>

          {/* Search */}
          <form className="anim-up s3" onSubmit={e => { e.preventDefault(); q.trim() && router.push(`/search?q=${encodeURIComponent(q.trim())}`) }}
            style={{ position:'relative', maxWidth:560, margin:'0 auto' }}>
            <Search size={20} style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Знайти товар: кабель, реле, автомат…" className="search-big" />
            <button type="submit" className="btn btn-primary" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', height:42, borderRadius:12 }}>
              <Zap size={15} /><span style={{ display:'none' }} className="sm:inline">Пошук</span>
            </button>
          </form>
        </div>
      </section>

      {/* Stats */}
      {status && (
        <div className="anim-up s4" style={{ maxWidth:900, margin:'0 auto 40px', padding:'0 16px' }}>
          <div className="card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:1, overflow:'hidden' }}>
            {[
              { label:'PDF файлів',  val:status.total,    icon:FileText,    color:'var(--brand-2)' },
              { label:'Оброблено',   val:status.done,     icon:CheckCircle, color:'var(--green)' },
              { label:'Розділів',    val:sections.length, icon:Layers,      color:'#a78bfa' },
              { label:'В обробці',   val:status.parsing,  icon:Package,     color:'var(--yellow)' },
            ].map(({ label, val, icon:Icon, color }) => (
              <div key={label} style={{ padding:'20px 24px', display:'flex', alignItems:'center', gap:14, borderRight:'1px solid var(--border)' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'monospace' }}>{val}</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections grid */}
      <section style={{ maxWidth:1280, margin:'0 auto', padding:'0 16px 60px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:20, fontWeight:700 }}>Розділи каталогу</h2>
          <Link href="/search" style={{ fontSize:13, color:'var(--brand-2)', display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>Переглянути всі <ChevronRight size={14}/></Link>
        </div>

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
            {Array.from({length:10}).map((_,i)=><div key={i} className="skeleton" style={{height:140,borderRadius:14}} />)}
          </div>
        ) : sections.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>
            {sections.map((s, i) => (
              <Link key={s.id} href={`/catalog/${s.slug}?id=${s.id}`} className={`anim-up s${Math.min(i%6+1,6)}`}
                style={{ textDecoration:'none', display:'block' }}>
                <div className="card card-hover" style={{ padding:20, cursor:'pointer', height:'100%' }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:COLORS[i%COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:12 }}>
                    {getIcon(s.name)}
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4, lineHeight:1.3 }}>{s.name}</h3>
                  <p style={{ fontSize:12, color:'var(--text-3)', fontFamily:'monospace' }}>{s.document_count} PDF</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card" style={{ padding:60, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
      <h3 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Каталог порожній</h3>
      <p style={{ color:'var(--text-2)', marginBottom:24 }}>Перейдіть до адмін-панелі та імпортуйте PDF файли</p>
      <Link href="/admin" className="btn btn-primary">⚡ Адмін-панель</Link>
    </div>
  )
}
