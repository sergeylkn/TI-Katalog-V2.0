'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Zap, Loader2, Sparkles, Target, X, AlertCircle } from 'lucide-react'
import { catalogApi, SearchResult, Section, Product } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import debounce from 'debounce'

function SearchContent() {
  const sp       = useSearchParams()
  const router   = useRouter()
  const initQ    = sp.get('q') || ''

  const [liveQ, setLiveQ]       = useState(initQ)
  const [query, setQuery]       = useState(initQ)
  const [results, setResults]   = useState<SearchResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [secFilter, setSecF]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    catalogApi.getSections().then(setSections).catch(() => {})
    inputRef.current?.focus()
    if (initQ) runSearch(initQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = useCallback(async (q: string, sid?: string) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true); setError('')
    try {
      // ИСПРАВЛЕНО: Добавлены скобки для корректного смешивания ?? и ||
      const res = await catalogApi.search(q.trim(), (sid ?? secFilter) || undefined)
      setResults(res)
      router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false })
    } catch (e: any) {
      setError(e.message || 'Помилка AI пошуку')
    } finally { setLoading(false) }
  }, [secFilter, router])

  const debouncedSearch = useCallback(debounce((q: string) => {
    setQuery(q); runSearch(q)
  }, 650), [runSearch])

  const handleInput = (v: string) => { setLiveQ(v); debouncedSearch(v) }

  const handleSection = (id: string) => {
    setSecF(id)
    if (query) runSearch(query, id)
  }

  const clear = () => { setLiveQ(''); setQuery(''); setResults(null); setError(''); inputRef.current?.focus() }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 16px' }}>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={20} style={{ color: 'var(--brand-2)' }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>AI Пошук по каталогу</h1>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Семантичний пошук з аналізом Claude · знаходить навіть неточні запити
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto 20px' }}>
        <Search size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: loading ? 'var(--brand-2)' : 'var(--text-3)', pointerEvents: 'none', transition: 'color .2s' }} />
        <input
          ref={inputRef}
          value={liveQ}
          onChange={e => handleInput(e.target.value)}
          placeholder="Введіть назву товару, параметри, SKU…"
          className="search-big"
          autoFocus
        />
        {loading && <Loader2 size={18} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-2)', animation: 'spin 1s linear infinite' }} />}
        {!loading && liveQ && (
          <button onClick={clear} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Section pills */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          <button onClick={() => handleSection('')} className={`badge ${!secFilter ? 'badge-brand' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 14px', fontSize: 12 }}>
            Всі розділи
          </button>
          {sections.slice(0, 8).map(s => (
            <button key={s.id} onClick={() => handleSection(s.id)} className={`badge ${secFilter === s.id ? 'badge-brand' : 'badge-muted'}`} style={{ cursor: 'pointer', padding: '5px 14px', fontSize: 12 }}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', marginBottom: 24 }}>
          <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--red)', fontSize: 13 }}>Помилка пошуку</p>
            <p style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div>
          <div className="skeleton" style={{ height: 88, borderRadius: 14, marginBottom: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="anim-in">
          {/* AI Summary */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(69,97,248,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={18} style={{ color: 'var(--brand-2)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>AI Аналіз</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={12} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Впевненість:</span>
                    <div className="conf-bar" style={{ width: 80 }}>
                      <div className="conf-fill" style={{ width: `${Math.round((results.confidence || 0) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--brand-2)', fontWeight: 700 }}>
                      {Math.round((results.confidence || 0) * 100)}%
                    </span>
                  </div>
                  {results.cached && <span className="badge badge-muted" style={{ fontSize: 11 }}>кешовано</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {results.summary || 'Результати отримано'}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                  <span>📄 {results.total_candidates} кандидатів</span>
                  <span>✅ {results.products.length} результатів</span>
                  <span>🔍 «{query}»</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product grid */}
          {results.products.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Search size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Нічого не знайдено</p>
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>Спробуйте інший запит або зменшіть фільтри</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              {results.products.map((p, i) => (
                <div key={p.id} className={`anim-up s${Math.min(i % 6 + 1, 6)}`}>
                  <ProductCard product={p} relevance={p.relevance} reason={p.reason} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !results && !error && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Почніть пошук</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 28 }}>
            AI проаналізує каталог і знайде найбільш релевантні товари
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {['кабель ВВГ 3х2.5', 'автомат 16А', 'датчик руху', 'LED прожектор', 'розетка IP44'].map(hint => (
              <button key={hint} onClick={() => { setLiveQ(hint); handleInput(hint) }}
                className="badge badge-muted" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 13 }}>
                {hint}
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
    <Suspense fallback={
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 16px' }}>
        <div className="skeleton" style={{ height: 60, borderRadius: 16, maxWidth: 640, margin: '0 auto 20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginTop: 32 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />)}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
