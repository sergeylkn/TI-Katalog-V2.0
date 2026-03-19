'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, Tag, FileText, Loader2, Star, Zap, ExternalLink } from 'lucide-react'
import { apiService, Product } from '@/lib/api'

const ATTR_ICONS: Record<string, string> = {
  'Тиск':'⚡','Діаметр':'⭕','Матеріал':'🔩','Різьба':'🔧',
  'Температура':'🌡️','Довжина':'📏','Стандарт':'📋',
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const prodId = Number(params.id)
  const [p,         setP]        = useState<Product | null>(null)
  const [recs,      setRecs]     = useState<(Product & { reason: string })[]>([])
  const [activeImg, setActiveImg]= useState(0)
  const [loading,   setLoading]  = useState(true)
  const [loadRecs,  setLoadRecs] = useState(false)
  const [docUrl,    setDocUrl]   = useState('')

  useEffect(() => {
    apiService.getProduct(prodId)
      .then(async prod => {
        setP(prod); setLoading(false)
        try {
          const doc = await apiService.getDocument(prod.document_id)
          const base = doc.file_url || doc.original_url || ''
          setDocUrl(prod.page_number ? `${base}#page=${prod.page_number}` : base)
        } catch {}
        setLoadRecs(true)
        apiService.recommendations(prodId)
          .then(r => setRecs(r.recommendations as (Product & { reason: string })[]))
          .catch(() => {})
          .finally(() => setLoadRecs(false))
      })
      .catch(() => setLoading(false))
  }, [prodId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />
    </div>
  )
  if (!p) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: 'var(--text-2)' }}>Товар не знайдено</p>
      <Link href="/" className="btn btn-ghost" style={{ marginTop: 16 }}>← Головна</Link>
    </div>
  )

  const imgs = p.images || []
  const cur  = imgs[activeImg]
  const attrs = p.attributes || {}

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 16px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 22 }}>
        <ArrowLeft size={14} />Назад
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 36 }}>
        {/* Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {cur || p.primary_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${cur?.data || p.primary_image}`} alt={p.title}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 16 }} />
            ) : <Package size={60} style={{ color: 'var(--text-3)' }} />}
          </div>
          {imgs.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {imgs.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImg(i)} style={{
                  width: 60, height: 60, flexShrink: 0, borderRadius: 9, overflow: 'hidden',
                  padding: 3, border: `2px solid ${i === activeImg ? 'var(--brand)' : 'var(--border)'}`,
                  background: 'var(--bg-hover)', cursor: 'pointer',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${img.data}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>
          )}
          {docUrl && (
            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <FileText size={14} />
              {p.page_number ? `Відкрити PDF (ст. ${p.page_number})` : 'Відкрити PDF'}
              <ExternalLink size={12} style={{ color: 'var(--text-3)' }} />
            </a>
          )}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {p.sku && <span className="badge badge-brand" style={{ alignSelf: 'flex-start' }}><Tag size={11} />{p.sku}</span>}
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.02em' }}>{p.title}</h1>
          {p.description && <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 14 }}>{p.description}</p>}

          {Object.keys(attrs).length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '9px 16px', background: 'var(--bg-hover)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                ⚙️ Технічні характеристики
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(attrs).map(([k, v], i, arr) => (
                    <tr key={k} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-3)', width: '42%' }}>
                        {ATTR_ICONS[k] || '•'} {k}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.page_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-3)' }}>Сторінка PDF</span>
                <span className="badge badge-muted" style={{ fontFamily: 'monospace' }}>{p.page_number}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-3)' }}>ID документа</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>#{p.document_id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <section style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Zap size={17} style={{ color: 'var(--brand-2)' }} />
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Схожі товари</h2>
          {loadRecs && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-3)' }} />}
        </div>
        {recs.length === 0 && !loadRecs
          ? <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Немає рекомендацій</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(196px,1fr))', gap: 12 }}>
              {(loadRecs ? Array.from({ length: 5 }) : recs).map((r, i) => !r ? (
                <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />
              ) : (
                <Link key={r.id} href={`/product/${r.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover" style={{ padding: 13, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                      <Star size={11} style={{ color: 'var(--brand-2)', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{r.title}</p>
                    </div>
                    {r.sku && <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)' }}>{r.sku}</p>}
                    {r.reason && <p style={{ fontSize: 11, color: 'var(--brand-2)', marginTop: 5, lineHeight: 1.3 }}>{r.reason}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
