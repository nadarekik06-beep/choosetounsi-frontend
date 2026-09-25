'use client'

import Link from 'next/link'
import { useFlashTimeLeft } from '@/app/components/promotions/FlashCountdownBadge'
import { formatPrice as formatLocalePrice } from '@/lib/i18n/format'

const RED   = '#db142e'
const GREEN = '#198f41'

/** Hover / focus styles for .ct-product-card — render once, in the chat widget. */
export const CHAT_PRODUCT_CARD_CSS = `
  .ct-product-card { transition: border-color .15s, box-shadow .15s, transform .15s; }
  .ct-product-card:hover, .ct-product-card:focus-visible {
    border-color: ${RED} !important;
    box-shadow: 0 2px 12px ${RED}20;
    transform: translateY(-1px);
    outline: none;
  }
  .ct-product-card:active { border-color: ${GREEN} !important; }
`

export type ChatLang = 'en' | 'fr' | 'ar'

/** Product as returned by POST /api/ai/chat — always a real product from the database. */
export interface ChatProduct {
  id: number
  name: string
  price: number
  old_price: number | null
  price_from: boolean
  image: string | null
  seller: string | null
  rating: number | null
  rating_count: number
  flash_sale: boolean
  flash_ends_at?: string | null
  url: string
}

const LABELS: Record<ChatLang, { from: string; currency: string; flash: string; by: string }> = {
  en: { from: 'from',        currency: 'DT',  flash: 'Flash sale', by: 'by' },
  fr: { from: 'dès',         currency: 'DT',  flash: 'Vente flash', by: 'par' },
  ar: { from: 'ابتداءً من', currency: 'د.ت', flash: 'تخفيض سريع', by: '' },
}

/** Whole amounts without decimals, otherwise millimes — in the reply's language. */
export function formatPrice(value: number, lang: ChatLang): string {
  const digits = Math.abs(value - Math.round(value)) < 0.0005 ? 0 : 3
  return formatLocalePrice(value, lang, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function Placeholder() {
  return (
    <div aria-hidden style={{
      width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#cbd5e1',
    }}>
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  )
}

export default function ChatProductCard({ product, lang }: { product: ChatProduct; lang: ChatLang }) {
  const t = LABELS[lang]
  const timeLeft = useFlashTimeLeft(product.flash_sale ? product.flash_ends_at : null)

  return (
    <Link
      href={product.url}
      className="ct-product-card"
      style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: 8,
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 64,
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
        flexShrink: 0, background: '#f4f4f5', position: 'relative',
      }}>
        {product.image ? (
          // Backend storage URLs are on another origin; plain <img> avoids next/image domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <Placeholder />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p dir="auto" style={{
          margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {product.seller && (
            <span dir="auto" style={{
              fontSize: 11, color: '#6b7280', maxWidth: 140,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {t.by ? `${t.by} ` : ''}{product.seller}
            </span>
          )}
          {product.rating !== null && (
            <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>
              ★ {product.rating.toFixed(1)}
              <span style={{ color: '#9ca3af', fontWeight: 500 }}> ({product.rating_count})</span>
            </span>
          )}
          {product.flash_sale && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#fff', background: RED,
              padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
            }}>
              ⚡ {t.flash}{timeLeft && <span style={{ fontVariantNumeric: 'tabular-nums' }}> · {timeLeft}</span>}
            </span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'end' }}>
        {product.price_from && (
          <p style={{ margin: 0, fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{t.from}</p>
        )}
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: RED, whiteSpace: 'nowrap' }}>
          {formatPrice(product.price, lang)}
        </p>
        {product.old_price !== null && (
          <p style={{
            margin: 0, fontSize: 11, color: '#9ca3af',
            textDecoration: 'line-through', whiteSpace: 'nowrap',
          }}>
            {formatPrice(product.old_price, lang)}
          </p>
        )}
      </div>
    </Link>
  )
}
