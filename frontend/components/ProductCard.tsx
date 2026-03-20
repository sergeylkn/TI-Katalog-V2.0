'use client'
import Link from 'next/link'
import { FileText, Tag } from 'lucide-react'
import { Product } from '@/lib/api'

export function ProductCard({ product: p }: { product: Product }) {
  const attrs = Object.entries(p.attributes || {}).slice(0, 3)
  return (
    <Link href={`/product/${p.id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover" style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* PDF icon placeholder */}
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', borderRadius: 8 }}>
          <FileText size={28} style={{ color: 'var(--brand)', opacity: .6 }} />
        </div>

        <div style={{ flex: 1 }}>
          {p.sku && (
            <div className="badge badge-muted" style={{ marginBottom: 5 }}>
              <Tag size={9} />{p.sku}
            </div>
          )}
          <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {p.title}
          </p>
        </div>

        {attrs.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {attrs.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
                <span>{k}</span>
                <span style={{ color: 'var(--text-2)', fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {p.page_number && (
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>стор. {p.page_number}</div>
        )}
      </div>
    </Link>
  )
}
