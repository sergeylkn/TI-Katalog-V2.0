'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Zap, Loader2, Sparkles, Target, X, AlertCircle, Database } from 'lucide-react'
import { apiService, SearchResponse, Section } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import debounce from 'debounce'

function SearchContent() {
  const sp     = useSearchParams()
  const router = useRouter()
  const initQ  = sp.get('q') || ''

  const [liveQ,   setLiveQ]   = useState(initQ)
  const [query,   setQuery]   = useState(initQ)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sections,setSections]= useState<Section[]>([])
  const [secId,   setSecId]   = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiService.getSections().then(setSections).catch(() => {})
    inputRef.current?.focus()
    if (initQ) run(initQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = useCallback(async (q: string, sid?: number | null) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true); setError('')
    try {
      const res = await apiService.search(q.trim(), (sid ?? secId) ?? undefined)
      setResults(res)
      router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка пошуку')
    } finally { setLoading(false) }
  }, [secId, router])

  const debounced = useCallback(debounce((q: string) => { setQuery(q); run(q) }, 600), [run])
  const handleInput = (v: string) => { setLiveQ(v); debounced(v) }
  const handleSec = (id: number | null) => { setSecId(id); if (query) run(query, id) }
  const clear = () => { setLiveQ(''); setQuery(''); setResults(null); setError(''); inputRef.current?.focus() }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '44px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Zap size={20} style={{ color: 'var(--brand-2)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>AI Пошук по каталогу</h1>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Семантичний пошук з аналізом Claude · автоматичний fallback на PostgreSQL FTS
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto 18px' }}>
        <Search size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: loading ? 'var(--brand-2)' : 'var(--text-3)', pointerEvents: 'none', transition: 'color .2s' }} />
        <input ref={inputRef} value={liveQ} onChange={e => handleInput(e.target.value)}
          placeholder="DN65 шланг, PN16 манометр, BSP фітинг…" className="search-big" autoFocus />
        {loading
          ? <Loader2 size={18} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-2)', animation: 'spin 1s linear infinite' }} />
          : liveQ && <button onClick={clear} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}><X size={16} /></button>
        }
      </div>

      {/* Section filter */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 28 }}>
          <button onClick={() => handleSec(null)} className={`badge ${secId === null ? 'badge-brand' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 13px', fontSize: 12 }}>Всі розділи</button>
          {sections.slice(0, 9).map(s => (
            <button key={s.id} onClick={() => handleSec(s.id)} className={`badge ${secId === s.id ? 'badge-brand' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 13px', fontSize: 12 }}>{s.name}</button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 12, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', marginBottom: 22 }}>
          <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div>
          <div className="skeleton" style={{ height: 80, borderRadius: 13, marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 258, borderRadius: 14 }} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="anim-in">
          {/* Summary card */}
          <div className="card" style={{ padding: '16px 18px', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(61,90,241,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {results.source === 'pg_fts'
                  ? <Database size={17} style={{ color: 'var(--brand-2)' }} />
                  : <Sparkles size={17} style={{ color: 'var(--brand-2)' }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    {results.source === 'pg_fts' ? 'PostgreSQL FTS' : 'Claude AI'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Target size={11} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Впевненість:</span>
                    <div className="conf-bar" style={{ width: 72 }}>
                      <div className="conf-fill" style={{ width: `${Math.round((results.confidence || 0) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--brand-2)', fontWeight: 700 }}>
                      {Math.round((results.confidence || 0) * 100)}%
                    </span>
                  </div>
                  {results.cached && <span className="badge badge-muted" style={{ fontSize: 10 }}>кешовано</span>}
                  {results.source === 'pg_fts' && <span className="badge badge-yellow" style={{ fontSize: 10 }}>⚡ FTS fallback</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{results.summary || 'Результати отримано'}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
                  <span>📄 {results.total_candidates} кандидатів</span>
                  <span>✅ {results.products.length} результатів</span>
                  <span>🔍 «{query}»</span>
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          {results.products.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Search size={30} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 600, marginBottom: 5 }}>Нічого не знайдено</p>
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Спробуйте інший запит або перевірте розділи каталогу</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
              {results.products.map((p, i) => (
                <div key={p.id} className={`anim-up s${Math.min((i % 6) + 1, 6)}`}>
                  <ProductCard product={p} relevance={p.relevance} reason={p.reason} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !results && !error && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 7 }}>Почніть пошук</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 26 }}>
            Claude AI проаналізує 189 каталогів і знайде потрібне обладнання
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {['Шланг DN65 16bar','Манометр PN40','Фітинг BSP 1"','Насос відцентровий','Ущільнення PTFE DN50'].map(h => (
              <button key={h} onClick={() => { setLiveQ(h); handleInput(h) }}
                className="badge badge-muted" style={{ cursor: 'pointer', padding: '8px 15px', fontSize: 13 }}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 980, margin: '0 auto', padding: '44px 16px' }}><div className="skeleton" style={{ height: 60, borderRadius: 16, maxWidth: 640, margin: '0 auto' }} /></div>}>
      <SearchContent />
    </Suspense>
  )
}
