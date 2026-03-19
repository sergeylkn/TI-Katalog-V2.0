'use client'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react'
import { apiService } from '@/lib/api'

function PDFContent({ docId }: { docId: number }) {
  const sp         = useSearchParams()
  const targetPage = parseInt(sp.get('page') || '1')
  const targetX    = parseFloat(sp.get('x') || '0')
  const targetY    = parseFloat(sp.get('y') || '0')

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfRef       = useRef<unknown>(null)
  const taskRef      = useRef<unknown>(null)

  const [curPage,   setCurPage]   = useState(targetPage)
  const [total,     setTotal]     = useState(0)
  const [scale,     setScale]     = useState(1.4)
  const [loading,   setLoading]   = useState(true)
  const [pageLoad,  setPageLoad]  = useState(false)
  const [filename,  setFilename]  = useState('')
  const [pageInput, setPageInput] = useState(String(targetPage))
  const [highlight, setHighlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const doc = await apiService.getDocument(docId)
      setFilename(doc.name || doc.filename || 'PDF')
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      if (cancelled) return
      const pdfUrl = doc.file_url || doc.original_url
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise
      if (cancelled) return
      pdfRef.current = pdf; setTotal(pdf.numPages); setLoading(false)
      renderPage(pdf, targetPage)
    }
    load().catch(() => setLoading(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  const renderPage = useCallback(async (pdf: unknown, pn: number) => {
    if (!canvasRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (taskRef.current) { try { await (taskRef.current as any).cancel() } catch {} }
    setPageLoad(true); setHighlight(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page     = await (pdf as any).getPage(pn)
      const viewport = page.getViewport({ scale })
      const canvas   = canvasRef.current!
      const ctx      = canvas.getContext('2d')!
      canvas.width   = viewport.width; canvas.height = viewport.height
      const task     = page.render({ canvasContext: ctx, viewport })
      taskRef.current = task
      await task.promise
      if (pn === targetPage && (targetX || targetY)) {
        setHighlight({ x: targetX * scale, y: targetY * scale, w: 200 * scale, h: 60 * scale })
        setTimeout(() => containerRef.current?.scrollTo({ top: targetY * scale - 120, behavior: 'smooth' }), 100)
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'RenderingCancelledException') console.error(e)
    } finally { setPageLoad(false) }
  }, [scale, targetPage, targetX, targetY])

  useEffect(() => { if (pdfRef.current) renderPage(pdfRef.current, curPage) }, [curPage, scale, renderPage])

  const go = (n: number) => {
    const p = Math.max(1, Math.min(n, total))
    setCurPage(p); setPageInput(String(p))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-ghost btn-sm"><ArrowLeft size={13} />Назад</Link>
        <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => go(curPage - 1)} disabled={curPage <= 1} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={14} /></button>
          <input value={pageInput} onChange={e => setPageInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go(parseInt(pageInput))}
            className="input" style={{ width: 50, height: 30, textAlign: 'center', fontSize: 13, padding: '3px 6px', borderRadius: 8 }} />
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/ {total}</span>
          <button onClick={() => go(curPage + 1)} disabled={curPage >= total} className="btn btn-ghost btn-sm btn-icon"><ChevronRight size={14} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <button onClick={() => setScale(s => Math.max(.5, s - .2))} className="btn btn-ghost btn-sm btn-icon"><ZoomOut size={14} /></button>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', minWidth: 34, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + .2))} className="btn btn-ghost btn-sm btn-icon"><ZoomIn size={14} /></button>
          <button onClick={() => setScale(1.4)} className="btn btn-ghost btn-sm btn-icon"><RotateCcw size={12} /></button>
        </div>
      </div>

      {targetPage > 1 && (
        <div style={{ padding: '6px 14px', fontSize: 12, background: 'rgba(61,90,241,.1)', borderBottom: '1px solid rgba(61,90,241,.2)', color: 'var(--brand-2)', flexShrink: 0 }}>
          📍 Перехід до сторінки {targetPage}
        </div>
      )}

      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 20, background: '#111' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#aaa', marginTop: 80 }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-2)' }} />Завантаження PDF…
          </div>
        ) : (
          <div style={{ position: 'relative', boxShadow: '0 16px 64px rgba(0,0,0,.6)', display: 'inline-block' }}>
            {pageLoad && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)', zIndex: 5 }}>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: 'white' }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            {highlight && <div className="pdf-hl" style={{ left: highlight.x, top: highlight.y, width: highlight.w, height: highlight.h }} />}
          </div>
        )}
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '7px 14px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 13 }}>
          <button onClick={() => go(1)}              disabled={curPage <= 1}    className="btn btn-ghost btn-sm">⏮</button>
          <button onClick={() => go(curPage - 1)}    disabled={curPage <= 1}    className="btn btn-ghost btn-sm">←</button>
          <span style={{ color: 'var(--text-3)' }}>{curPage} / {total}</span>
          <button onClick={() => go(curPage + 1)}    disabled={curPage >= total} className="btn btn-ghost btn-sm">→</button>
          <button onClick={() => go(total)}          disabled={curPage >= total} className="btn btn-ghost btn-sm">⏭</button>
        </div>
      )}
    </div>
  )
}

export default function PDFPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}><Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <PDFContent docId={Number(params.id)} />
    </Suspense>
  )
}
