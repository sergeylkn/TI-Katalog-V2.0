'use client'
import Link from 'next/link'
import { Package, Tag, FileText } from 'lucide-react'
import type { Product } from '@/lib/api'

// Technical attribute icon mapping
const ATTR_ICONS: Record<string, string> = {
  'Тиск': '⚡', 'Діаметр': '⭕', 'Матеріал': '🔩',
  'Різьба': '🔧', 'Температура': '🌡️', 'Довжина': '📏',
  'Стандарт': '📋',
}

export function ProductCard({ product, relevance, reason }: {
  product: Product; relevance?: number; reason?: string
}) {
  const attrs = product.attributes || {}
  const attrEntries = Object.entries(attrs).slice(0, 4)

  return (
    <Link href={`/product/${product.id}`} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>
      <article className="card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}>

        {/* Image */}
        <div style={{ height: 156, background: 'var(--bg-hover)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {product.primary_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${product.primary_image}`} alt={product.title}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8, transition: 'transform .3s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          ) : (
            <Package size={34} style={{ color: 'var(--text-3)' }} />
          )}
          {relevance !== undefined && (
            <span className="badge badge-brand" style={{ position: 'absolute', top: 8, right: 8, fontSize: 11 }}>
              {Math.round(relevance * 100)}%
            </span>
          )}
          {product.sku && (
            <span className="badge badge-muted" style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10 }}>
              <Tag size={9} />{product.sku}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <h3 style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {product.title}
          </h3>

          {reason && (
            <p style={{ fontSize: 11, color: 'var(--brand-2)', lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              {reason}
            </p>
          )}

          {/* Technical attributes */}
          {attrEntries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {attrEntries.map(([k, v]) => (
                <span key={k} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 7px', borderRadius: 6,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  fontSize: 10, whiteSpace: 'nowrap',
                }}>
                  <span style={{ color: 'var(--text-3)' }}>{ATTR_ICONS[k] || ''}{k}:</span>
                  <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace' }}>{v}</span>
                </span>
              ))}
            </div>
          )}

          {!reason && !attrEntries.length && product.description && (
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              {product.description}
            </p>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FileText size={10} />
              {product.page_number ? `Ст. ${product.page_number}` : 'PDF'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>→</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
