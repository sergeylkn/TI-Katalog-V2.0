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
  const [sectionId, setSectionId] = useState<number | null>(sp.get('id') ? Number(sp.get('id')) : null)
  const [secName, setSecName] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiService.getSections().then(secs => {
      const s = secs.find(x => x.slug === slug || x.id === sectionId)
      if (s) { setSecName(s.name); if (!sectionId) setSectionId(s.id) }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetch = useCallback(async (q: string, pg: number, sid: number | null) => {
    if (!sid) return
    setLoading(true)
    try {
      const p: Record<string,unknown> = { section_id: sid, page: pg, page_size: 24 }
      if (q) p.search = q
      const d = await apiService.getProducts(p)
      setProducts(d.items); setTotal(d.total)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (sectionId) fetch('', 1, sectionId) }, [sectionId, fetch])

  const debounced = useCallback(debounce((q: string, sid: number | null) => { setPage(1); fetch(q, 1, sid) }, 350), [fetch])
  const pages = Math.ceil(total / 24)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 16px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={13} /> Розділи
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{secName || 'Розділ'}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 3 }}>{total.toLocaleString('uk')} товарів</p>
        </div>
        <div style={{ position: 'relative', width: 220 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); debounced(e.target.value, sectionId) }}
            placeholder="Фільтр…" className="input" style={{ paddingLeft: 30, height: 34, fontSize: 12 }} />
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
          {Array.from({length: 24}).map((_,i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Package size={30} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{search ? `Нічого за «${search}»` : 'Товарів ще немає — запустіть імпорт в адмінці'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
            {products.map((p, i) => (
              <div key={p.id} className={`anim-up s${Math.min((i%6)+1,6)}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={() => { const p=page-1; setPage(p); fetch(search,p,sectionId) }} disabled={page<=1} className="btn btn-ghost btn-sm">←</button>
              {Array.from({length: Math.min(pages,7)},(_,i)=>i+1).map(p => (
                <button key={p} onClick={() => { setPage(p); fetch(search,p,sectionId) }}
                  className={`btn btn-sm ${page===p?'btn-primary':'btn-ghost'}`} style={{ width:34, padding:0 }}>{p}</button>
              ))}
              <button onClick={() => { const p=page+1; setPage(p); fetch(search,p,sectionId) }} disabled={page>=pages} className="btn btn-ghost btn-sm">→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CatalogPage({ params }: { params: { section: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <CatalogContent slug={params.section} />
    </Suspense>
  )
}
