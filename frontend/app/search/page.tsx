'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Loader2, FileText, Zap, Database } from 'lucide-react'
import { apiService, SearchResult } from '@/lib/api'
import debounce from 'debounce'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('')
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) { setResults([]); setSearched(false); return }
      setLoading(true)
      try {
        const d = await apiService.search(query)
        setResults(d.results); setSource(d.source); setSearched(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 400),
    []
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
        <Zap size={20} style={{ color: 'var(--brand-2)', verticalAlign: 'middle', marginRight: 6 }} />
        AI Пошук
      </h1>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        {loading && <Loader2 size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />}
        <input
          className="input"
          style={{ paddingLeft: 38, height: 46, fontSize: 15 }}
          placeholder="Пошук товарів… (наприклад: манометр 10 бар, DN50 шланг)"
          value={q}
          onChange={e => { setQ(e.target.value); doSearch(e.target.value) }}
          autoFocus
        />
      </div>

      {source && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 11, color: 'var(--text-3)' }}>
          {source.includes('ai') ? <Zap size={10} style={{ color: 'var(--brand-2)' }} /> : <Database size={10} />}
          {source.includes('ai') ? 'AI + PostgreSQL пошук' : 'PostgreSQL пошук'}
          {' · '}{results.length} результатів
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          Нічого не знайдено за «{q}»
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map((r, i) => (
          <Link key={r.id} href={`/product/${r.id}`} style={{ textDecoration: 'none' }}>
            <div className={`card card-hover anim-up s${Math.min(i+1,6)}`} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</span>
                    {r.sku && <span className="badge badge-muted">{r.sku}</span>}
                  </div>
                  {r.description && <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{r.description}</p>}
                  {Object.keys(r.attributes || {}).length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {Object.entries(r.attributes).slice(0, 4).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 10, color: 'var(--text-3)' }}>{k}: <b style={{ color: 'var(--text-2)' }}>{v}</b></span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {r.page_number && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                      <FileText size={10} /> стор. {r.page_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
