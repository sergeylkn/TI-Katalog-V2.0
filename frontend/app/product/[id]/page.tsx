'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Tag, ExternalLink, Loader2, Zap } from 'lucide-react'
import { apiService, Product } from '@/lib/api'

const ICONS: Record<string,string> = { 'Тиск':'⚡','Діаметр':'⭕','Матеріал':'🔩','Різьба':'🔧','Температура':'🌡️','Довжина':'📏','Стандарт':'📋' }

export default function ProductPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  const [p, setP] = useState<(Product & {document_url:string,original_url?:string}) | null>(null)
  const [recs, setRecs] = useState<(Product&{reason:string})[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiService.getProduct(id)
      .then(prod => {
        setP(prod); setLoading(false)
        apiService.recommendations(id).then(r => setRecs(r.recommendations as (Product&{reason:string})[])).catch(()=>{})
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Loader2 size={26} style={{ animation:'spin 1s linear infinite', color:'var(--brand-2)' }} /></div>
  if (!p) return <div style={{ textAlign:'center', padding:80 }}><p style={{ color:'var(--text-2)' }}>Товар не знайдено</p><Link href="/" className="btn btn-ghost" style={{ marginTop:16 }}>← Головна</Link></div>

  const attrs = Object.entries(p.attributes || {})
  const pdfUrl = p.document_url || p.original_url

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px' }}>
      <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-2)', textDecoration:'none', marginBottom:22 }}>
        <ArrowLeft size={13} /> Назад
      </Link>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:32 }}>
        {/* Left — PDF preview */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ height:280, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <FileText size={52} style={{ color:'var(--brand)', opacity:.5 }} />
            <p style={{ fontSize:12, color:'var(--text-3)', textAlign:'center', maxWidth:180 }}>
              Зображення зберігаються в PDF.<br />Відкрийте документ нижче.
            </p>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ justifyContent:'center' }}>
              <FileText size={14} />
              {p.page_number ? `Відкрити PDF (ст. ${p.page_number})` : 'Відкрити PDF'}
              <ExternalLink size={11} />
            </a>
          )}
          {p.page_number && pdfUrl && (
            <Link href={`/pdf/${p.document_id}?page=${p.page_number}`} className="btn btn-ghost" style={{ justifyContent:'center' }}>
              Переглянути в PDF Viewer
            </Link>
          )}
        </div>

        {/* Right — Details */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {p.sku && <span className="badge badge-brand" style={{ alignSelf:'flex-start' }}><Tag size={10} />{p.sku}</span>}
          <h1 style={{ fontSize:20, fontWeight:800, lineHeight:1.3 }}>{p.title}</h1>
          {p.description && <p style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.7 }}>{p.description}</p>}

          {attrs.length > 0 && (
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'8px 14px', background:'var(--bg-hover)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-3)', borderBottom:'1px solid var(--border)' }}>
                ⚙️ Технічні характеристики
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>
                  {attrs.map(([k,v],i,a) => (
                    <tr key={k} style={{ borderBottom: i<a.length-1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding:'9px 14px', fontSize:12, color:'var(--text-3)', width:'42%' }}>{ICONS[k]||'•'} {k}</td>
                      <td style={{ padding:'9px 14px', fontSize:12, fontWeight:700, fontFamily:'monospace' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {p.page_number && (
            <div style={{ fontSize:12, color:'var(--text-3)' }}>
              📄 Сторінка PDF: <b style={{ color:'var(--text-2)', fontFamily:'monospace' }}>{p.page_number}</b>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <section style={{ marginTop:40 }}>
          <h2 style={{ fontSize:16, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <Zap size={15} style={{ color:'var(--brand-2)' }} /> Схожі товари
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10 }}>
            {recs.map(r => (
              <Link key={r.id} href={`/product/${r.id}`} style={{ textDecoration:'none' }}>
                <div className="card card-hover" style={{ padding:12 }}>
                  <p style={{ fontSize:12, fontWeight:600, lineHeight:1.35, marginBottom:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>{r.title}</p>
                  {r.sku && <p style={{ fontSize:10, fontFamily:'monospace', color:'var(--text-3)' }}>{r.sku}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
