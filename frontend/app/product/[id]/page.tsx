'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, Tag, FileText, ExternalLink, Loader2, Star, Zap } from 'lucide-react'
import { catalogApi, Product } from '@/lib/api'

// Описываем интерфейс для рекомендации
interface Recommendation {
  id: string;
  title: string;
  sku: string;
  reason: string;
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [p, setP]                   = useState<Product|null>(null)
  const [recs, setRecs]             = useState<Recommendation[]>([])
  const [activeImg, setActiveImg]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [loadRecs, setLoadRecs]     = useState(false)

  useEffect(() => {
    catalogApi.getProduct(params.id).then(prod => {
      setP(prod); setLoading(false)
      setLoadRecs(true)
      catalogApi.recommendations(prod.id).then(r => setRecs(r.recommendations)).catch(()=>{}).finally(()=>setLoadRecs(false))
    }).catch(()=>setLoading(false))
  }, [params.id])

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Loader2 size={28} style={{animation:'spin 1s linear infinite',color:'var(--brand-2)'}}/></div>
  if (!p) return <div style={{textAlign:'center',padding:80}}><p style={{color:'var(--text-2)'}}>Товар не знайдено</p><Link href="/" className="btn btn-ghost" style={{marginTop:16}}>← Головна</Link></div>

  const imgs  = p.images || []
  const cur   = imgs[activeImg]
  const pdfUrl = p.page_number && p.bbox
    ? `/pdf/${p.document_id}?page=${p.page_number}&x=${Math.round(p.bbox.x0)}&y=${Math.round(p.bbox.y0)}`
    : `/pdf/${p.document_id}`

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 16px' }}>
      <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-2)', textDecoration:'none', marginBottom:24 }}>
        <ArrowLeft size={14} />Назад
      </Link>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:40 }}>
        {/* Images */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ height:320, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {cur || p.primary_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${cur?.data || p.primary_image}`} alt={p.title}
                style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', padding:16 }} />
            ) : <Package size={64} style={{ color:'var(--text-3)' }} />}
          </div>

          {imgs.length > 1 && (
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {imgs.map((img, i) => (
                <button key={img.id} onClick={()=>setActiveImg(i)} style={{
                  width:64, height:64, flexShrink:0, borderRadius:10, overflow:'hidden', padding:4,
                  border:`2px solid ${i===activeImg?'var(--brand)':'var(--border)'}`,
                  background:'var(--bg-hover)', cursor:'pointer',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${img.data}`} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                </button>
              ))}
            </div>
          )}

          <Link href={pdfUrl} className="btn btn-ghost" style={{ justifyContent:'center' }}>
            <FileText size={14} />Переглянути в PDF<ExternalLink size={12} style={{color:'var(--text-3)'}} />
          </Link>
        </div>

        {/* Details */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {p.sku && <span className="badge badge-brand" style={{ alignSelf:'flex-start' }}><Tag size={11}/>{p.sku}</span>}
          <h1 style={{ fontSize:24, fontWeight:800, lineHeight:1.25, letterSpacing:'-.02em' }}>{p.title}</h1>
          {p.description && <p style={{ color:'var(--text-2)', lineHeight:1.7, fontSize:14 }}>{p.description}</p>}

          {Object.keys(p.attributes).length > 0 && (
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', background:'var(--bg-hover)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-3)', borderBottom:'1px solid var(--border)' }}>
                Технічні характеристики
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>
                  {Object.entries(p.attributes).map(([k,v],i,arr)=>(
                    <tr key={k} style={{ borderBottom: i<arr.length-1?'1px solid var(--border)':undefined }}>
                      <td style={{ padding:'10px 16px', fontSize:13, color:'var(--text-3)', width:'45%' }}>{k}</td>
                      <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {p.page_number && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'var(--text-3)' }}>Сторінка PDF</span>
                <span className="badge badge-muted" style={{ fontFamily:'monospace' }}>{p.page_number}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'var(--text-3)' }}>Документ</span>
              <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-2)' }}>{p.document_id.slice(0,8)}…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <section style={{ marginTop:56 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <Zap size={18} style={{ color:'var(--brand-2)' }} />
          <h2 style={{ fontSize:18, fontWeight:700 }}>AI Рекомендації</h2>
          {loadRecs && <Loader2 size={14} style={{ animation:'spin 1s linear infinite', color:'var(--text-3)' }} />}
        </div>
        {recs.length === 0 && !loadRecs
          ? <p style={{ color:'var(--text-3)', fontSize:13 }}>Рекомендації недоступні</p>
          : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
              {(loadRecs ? Array.from({length:5}) : recs).map((r: any, i: number) => !r ? (
                <div key={i} className="skeleton" style={{ height:100, borderRadius:14 }} />
              ) : (
                <Link key={r.id} href={`/product/${r.id}`} style={{ textDecoration:'none' }}>
                  <div className="card card-hover" style={{ padding:14, cursor:'pointer' }}>
                    <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                      <Star size={12} style={{ color:'var(--brand-2)', flexShrink:0, marginTop:2 }} />
                      <p style={{ fontSize:13, fontWeight:600, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{r.title}</p>
                    </div>
                    {r.sku && <p style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-3)' }}>{r.sku}</p>}
                    {r.reason && <p style={{ fontSize:11, color:'var(--brand-2)', marginTop:6, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{r.reason}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}
