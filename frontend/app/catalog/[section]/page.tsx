'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2, Package } from 'lucide-react'
import { apiService, Product } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import debounce from 'debounce'

function CatalogContent({ slug }: { slug: string }) {
  const sp = useSearchParams()

  const [sectionId, setSectionId] = useState<number | null>(
    sp.get('id') ? Number(sp.get('id')) : null
  )
  const [products,  setProducts]  = useState<Product[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [searching, setSearching] = useState(false)
  const [secName,   setSecName]   = useState('')

  // Resolve section by slug if id not in URL
  useEffect(() => {
    apiService.getSections().then(secs => {
      const s = secs.find(x => x.slug === slug || x.id === sectionId)
      if (s) {
        setSecName(s.name)
        if (!sectionId) setSectionId(s.id)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetchProducts = useCallback(async (q: string, pg: number, sid: number | null) => {
    if (!sid) return   // wait until section id is resolved
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        section_id: sid, page: pg, page_size: 24
      }
      if (q) params.search = q
      const d = await apiService.getProducts(params)
      setProducts(d.items); setTotal(d.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false); setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (sectionId) fetchProducts('', 1, sectionId)
  }, [sectionId, fetchProducts])

  const debounced = useCallback(
    debounce((q: string, sid: number | null) => fetchProducts(q, 1, sid), 380),
    [fetchProducts]
  )

  const totalPages = Math.ceil(total / 24)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 16px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 22 }}>
        <ArrowLeft size={14} />Розділи
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>{secName || 'Розділ'}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'monospace', marginTop: 3 }}>
            {total.toLocaleString('uk')} товарів
          </p>
        </div>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          {searching && <Loader2 size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-2)', animation: 'spin 1s linear infinite' }} />}
          <input value={search}
            onChange={e => {
              setSearch(e.target.value); setSearching(true); setPage(1)
              debounced(e.target.value, sectionId)
            }}
            placeholder="Фільтр…" className="input"
            style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
          />
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(196px,1fr))', gap: 14 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 258, borderRadius: 14 }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Package size={32} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--text-2)' }}>
            {search ? `Нічого за «${search}»` : 'Товарів немає — запустіть імпорт PDF в адмінці'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(196px,1fr))', gap: 14 }}>
            {products.map((p, i) => (
              <div key={p.id} className={`anim-up s${Math.min((i % 6) + 1, 6)}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 36, flexWrap: 'wrap' }}>
              <button onClick={() => { const p = page - 1; setPage(p); fetchProducts(search, p, sectionId) }}
                disabled={page <= 1} className="btn btn-ghost btn-sm">←</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPage(p); fetchProducts(search, p, sectionId) }}
                  className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: 36, padding: 0 }}>{p}</button>
              ))}
              <button onClick={() => { const p = page + 1; setPage(p); fetchProducts(search, p, sectionId) }}
                disabled={page >= totalPages} className="btn btn-ghost btn-sm">→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CatalogPage({ params }: { params: { section: string } }) {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(196px,1fr))', gap: 14 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 258, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    }>
      <CatalogContent slug={params.section} />
    </Suspense>
  )
}
