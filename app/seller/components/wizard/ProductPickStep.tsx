'use client'

/**
 * Step 1 of both wizards: the product picker, front and centre.
 *   - selected products on top (removable), with a counter
 *   - big search bar
 *   - the seller's products: image, name, price, stock, large tap target
 *   - inactive / pending / out-of-stock products are greyed with the reason and can't be picked
 */

import { useMemo, useState, type ReactNode } from 'react'
import { Search, X, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import BrandLoader from '@/components/brand/BrandLoader'
import { BRAND, Thumb } from './fields'

export interface WizVariant {
  id: number
  label: string
  stock: number
  price_override: number | null
  is_active: boolean
}

export interface WizProduct {
  id: number
  name: string
  /** Base price (what the backend compares a pack price with and computes discounts from) */
  price: number
  stock: number | null
  primary_image_url: string | null
  is_active: boolean
  is_approved: boolean
  has_variants: boolean
  variants: WizVariant[]
}

export type Unavailable = 'inactive' | 'pending' | 'outOfStock' | null

export function unavailableReason(p: WizProduct): Unavailable {
  if (!p.is_active) return 'inactive'
  if (!p.is_approved) return 'pending'
  if (p.stock !== null && p.stock <= 0) return 'outOfStock'
  return null
}

/** Case- and accent-insensitive match key ("Été" → "ete"). */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** /seller/packs/products?all=1 row → WizProduct */
export function toWizProduct(p: any): WizProduct {
  const variants = (p.variants ?? []) as any[]
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    stock: typeof p.stock === 'number' ? p.stock : null,
    primary_image_url: p.primary_image_url ?? null,
    is_active: p.is_active !== false,
    is_approved: p.is_approved !== false,
    has_variants: !!p.has_variants,
    variants: variants.map(v => ({
      id: v.id, label: v.label ?? '', stock: v.stock ?? 0,
      price_override: v.price_override != null ? Number(v.price_override) : null,
      is_active: v.is_active !== false,
    })),
  }
}

export default function ProductPickStep({
  products, loading, selectedIds, onToggle, selectedSlot, selectedCount, rowNote, error, intro,
}: {
  products: WizProduct[]
  loading: boolean
  selectedIds: number[]
  onToggle: (p: WizProduct, selected: boolean) => void
  /** The selected products, rendered as removable chips / cards under the counter */
  selectedSlot?: ReactNode
  selectedCount: number
  /** Extra line under a product row (e.g. "already in a promotion") */
  rowNote?: (p: WizProduct) => ReactNode
  error?: string | null
  intro?: ReactNode
}) {
  const t = useTranslations('seller.wizard')
  const fmt = useFormat()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = normalize(query)
    return q ? products.filter(p => normalize(p.name).includes(q)) : products
  }, [products, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {intro}

      {/* Counter + selected */}
      <div data-field="products" style={{
        borderRadius: 14, border: `1.5px solid ${error ? '#fca5a5' : selectedCount > 0 ? 'rgba(219,20,46,0.3)' : '#e5e7eb'}`,
        background: selectedCount > 0 ? 'rgba(219,20,46,0.03)' : '#f8fafc', padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <p aria-live="polite" style={{ margin: 0, fontSize: 14, fontWeight: 900, color: selectedCount > 0 ? BRAND : '#475569' }}>
          {t('selectedCount', { count: selectedCount })}
        </p>
        {selectedSlot}
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>{error}</p>}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, minHeight: 50,
        background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '0 14px',
      }}>
        <Search size={18} color="#94a3b8" aria-hidden />
        <label htmlFor="wz-product-search" className="sr-only">{t('searchPlaceholder')}</label>
        <input
          id="wz-product-search" type="search" autoComplete="off" value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          placeholder={t('searchPlaceholder')}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 16, color: '#0f172a', fontFamily: 'inherit', minHeight: 44,
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('clearSearch')} style={{
            width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
          }}><X size={16} /></button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div role="status" style={{ padding: 36, textAlign: 'center', color: '#5b6472', fontSize: 13 }}>
          <BrandLoader variant="inline" size={18} style={{ margin: '0 auto 8px', display: 'block' }} />
          {t('loading')}
        </div>
      ) : results.length === 0 ? (
        <p role="status" style={{ padding: 28, textAlign: 'center', color: '#5b6472', fontSize: 13, margin: 0 }}>
          {products.length === 0 ? t('noProducts') : t('noMatch')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(p => {
            const selected = selectedIds.includes(p.id)
            const reason = unavailableReason(p)
            // An unavailable product already in the selection (edit) can still be removed
            const disabled = !!reason && !selected
            const note = rowNote?.(p)
            return (
              <li key={p.id}>
                <button
                  type="button" role="checkbox" aria-checked={selected} aria-disabled={disabled}
                  className="wz-row"
                  onClick={() => { if (!disabled) onToggle(p, !selected) }}
                  style={{
                    width: '100%', minHeight: 72, display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 14, textAlign: 'start', fontFamily: 'inherit',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: `1.5px solid ${selected ? BRAND : '#e5e7eb'}`,
                    background: selected ? 'rgba(219,20,46,0.05)' : '#fff',
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  <span aria-hidden style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    border: `2px solid ${selected ? BRAND : '#cbd5e1'}`, background: selected ? BRAND : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>{selected && <Check size={17} strokeWidth={3} />}</span>
                  <Thumb src={p.primary_image_url} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{
                      fontSize: 13.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, overflowWrap: 'anywhere',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                      <strong style={{ color: '#0f172a' }}>{fmt.price(p.price, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</strong>
                      {p.stock !== null && (
                        <span style={{ color: p.stock > 0 ? '#64748b' : '#b91c1c' }}>
                          {p.stock > 0 ? t('inStock', { count: p.stock }) : t('reason.outOfStock')}
                        </span>
                      )}
                      {p.has_variants && <span>{t('variantCount', { count: p.variants.length })}</span>}
                    </span>
                    {reason && (
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#b91c1c' }}>{t(`reason.${reason}`)}</span>
                    )}
                    {note}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** A removable selected-product chip (promotion wizard). */
export function ProductChip({ product, onRemove }: { product: WizProduct; onRemove: () => void }) {
  const t = useTranslations('seller.wizard')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, maxWidth: '100%',
      background: '#fff', border: '1.5px solid rgba(219,20,46,0.25)', borderRadius: 999, padding: '4px 4px 4px 6px',
    }}>
      <Thumb src={product.primary_image_url} size={32} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
        {product.name}
      </span>
      <button type="button" onClick={onRemove} aria-label={t('remove', { name: product.name })} style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#b91c1c',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><X size={16} /></button>
    </span>
  )
}
