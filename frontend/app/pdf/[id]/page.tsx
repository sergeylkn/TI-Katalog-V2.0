'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react'
import { apiService, Document } from '@/lib/api'

function PDFContent({ docId }: { docId: number }) {
  const sp = useSearchParams()
  const initPage = sp.get('page') ? Number(sp.get('page')) : 1
  const [doc, setDoc] = useState<Document | null>(null)
  const [page, setPage] = useState(initPage)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<unknown>(null)
  const taskRef = useRef<unknown>(null)

  useEffect(() => {
    apiService.getDocument(docId).then(d => { setDoc(d); setTotalPages(d.page_count || 0) }).catch(() => {})
  }, [docId])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    setRendering(true)

    const load = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        if (!pdfRef.current) {
          // @ts-ignore
          pdfRef.current = await pdfjsLib.getDocument(doc.file_url).promise
          // @ts-ignore
          setTotalPages(pdfRef.current.numPages)
        }

        if (cancelled) return
        // @ts-ignore
        const pdfPage = await pdfRef.current.getPage(page)
        const viewport = pdfPage.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        canvas.height = viewport.height
        canvas.width = viewport.width
        const ctx = canvas.getContext('2d')!

        // @ts-ignore
        if (taskRef.current) taskRef.current.cancel()
        // @ts-ignore
        taskRef.current = pdfPage.render({ canvasContext: ctx, viewport })
        // @ts-ignore
        await taskRef.current.promise
      } catch (e: unknown) {
        // @ts-ignore
        if (e?.name !== 'RenderingCancelledException') console.error(e)
      } finally {
        if (!cancelled) { setRendering(false); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [doc, page])

  const goPage = (n: number) => { if (n >= 1 && n <= totalPages) setPage(n) }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/product/${docId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Назад
        </Link>
        <span style={{ fontSize: 13, color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc?.name || '…'}
        </span>
        {doc && (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            <ExternalLink size={11} /> Завантажити
          </a>
        )}
      </div>

      {/* Page controls */}
      {totalPages > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
          <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="btn btn-ghost btn-sm"><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 80, textAlign: 'center' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => goPage(page + 1)} disabled={page >= totalPages} className="btn btn-ghost btn-sm"><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Quick page jump */}
      {totalPages > 5 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {[1, Math.floor(totalPages/3), Math.floor(totalPages*2/3), totalPages].filter((v,i,a)=>a.indexOf(v)===i).map(n => (
            <button key={n} onClick={() => goPage(n)} className={`pdf-page-btn ${page===n?'active':''}`}>{n}</button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="card" style={{ overflow: 'auto', position: 'relative', minHeight: 400 }}>
        {(loading || rendering) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,17,23,.7)', zIndex: 5 }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }} />
      </div>
    </div>
  )
}

export default function PDFPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <PDFContent docId={Number(params.id)} />
    </Suspense>
  )
}
