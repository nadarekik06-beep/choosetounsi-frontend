'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingBag, X, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import { API_BASE } from '@/lib/constants'
import { currentLocale } from '@/lib/i18n/clientLocale'
import ProductPrice, { type PricedProduct } from '@/app/components/promotions/ProductPrice'
import { Stars, TierBadge, asTier } from './primitives'

interface QuickProduct extends PricedProduct {
  id: number
  name: string
  slug: string
  stock: number
  short_description?: string | null
  description?: string | null
  primary_image_url?: string | null
  images?: { url: string }[]
  category?: { name: string } | null
  seller?: { id: number; business_name?: string | null; name?: string } | null
  has_variants?: boolean
  variants?: { id: number; stock: number }[]
}

/** What the card already knows, shown instantly while the full product loads. */
export interface QuickSeed {
  slug: string
  name: string
  image: string | null
  plan?: string | null
  rating?: number | null
  reviews?: number
}

const QuickViewCtx = createContext<(seed: QuickSeed) => void>(() => {})
export const useQuickView = () => useContext(QuickViewCtx)

/** Renders the modal inside the page wrapper (fonts, tokens) and hands cards an opener. */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<QuickSeed | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const open = useCallback((s: QuickSeed) => {
    opener.current = document.activeElement as HTMLElement | null
    setSeed(s)
  }, [])
  const close = useCallback(() => {
    setSeed(null)
    opener.current?.focus?.()
  }, [])
  return (
    <QuickViewCtx.Provider value={open}>
      {children}
      {seed && <QuickViewModal seed={seed} onClose={close} />}
    </QuickViewCtx.Provider>
  )
}

function QuickViewModal({ seed, onClose }: { seed: QuickSeed; onClose: () => void }) {
  const t  = useTranslations('shopPage.quickView')
  const tc = useTranslations('shopPage.card')
  const tp = useTranslations('productCard')
  const router = useRouter()
  const { addToCart, isFavorited, toggleFavorite } = useCart()
  const [product, setProduct] = useState<QuickProduct | null>(null)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${API_BASE}/products/${encodeURIComponent(seed.slug)}`, {
      headers: { Accept: 'application/json', 'Accept-Language': currentLocale() },
      signal: ctrl.signal,
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => setProduct(j.data))
      .catch(e => { if (e?.name !== 'AbortError') setFailed(true) })
    return () => ctrl.abort()
  }, [seed.slug])

  // Escape closes, Tab stays inside, body doesn't scroll behind
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !dialog.current) return
      const items = dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const images = (() => {
    const out: string[] = []
    const push = (u?: string | null) => { if (u && !out.includes(u)) out.push(u) }
    push(product?.primary_image_url ?? seed.image)
    product?.images?.forEach(i => push(i.url))
    return out
  })()
  const variants = product?.variants ?? []
  const needsOptions = variants.length > 1
  const soldOut = product ? product.stock <= 0 : false
  const fav = product ? isFavorited(product.id) : false
  const tier = asTier(seed.plan)
  const shopName = product?.seller?.business_name || product?.seller?.name

  const add = async () => {
    if (!product || adding || soldOut) return
    if (needsOptions) { router.push(`/products/${product.slug}`); return }
    if (!isAuthenticated()) { router.push(`/auth/login?redirect=${encodeURIComponent('/shop')}`); return }
    setAdding(true)
    try {
      if (await addToCart(product.id, 1, variants.length === 1 ? variants[0].id : null)) {
        setAdded(true)
        setTimeout(onClose, 700)
      }
    } finally { setAdding(false) }
  }

  return (
    <div className="sp-qv-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialog} className="sp-qv" role="dialog" aria-modal="true" aria-labelledby="sp-qv-title">
        <button type="button" className="sp-qv__close" onClick={onClose} aria-label={t('close')} data-autofocus>
          <X size={18} aria-hidden="true" />
        </button>

        <div className="sp-qv__gallery">
          <div className="sp-qv__main">
            {images[active] ? (
              <Image src={images[active]} unoptimized={isLocalImage(images[active])} alt={seed.name} fill sizes="(min-width: 760px) 440px, 100vw" priority />
            ) : <div className="sp-card__ph" />}
          </div>
          {images.length > 1 && (
            <div className="sp-qv__thumbs">
              {images.slice(0, 8).map((src, i) => (
                <button key={src} type="button" className="sp-qv__thumb" aria-current={i === active}
                  aria-label={t('image', { index: i + 1, total: images.length })} onClick={() => setActive(i)}>
                  <Image src={src} unoptimized={isLocalImage(src)} alt="" fill sizes="56px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sp-qv__info">
          {product?.category?.name && <p className="sp-qv__cat">{product.category.name}</p>}
          <h2 id="sp-qv-title" className="sp-qv__name">{product?.name ?? seed.name}</h2>
          {(shopName || tier) && (
            <p className="sp-qv__seller">
              {t('soldBy')}{' '}
              {product?.seller?.id ? <Link href={`/sellers/${product.seller.id}`}>{shopName}</Link> : <b>{shopName}</b>}
              {tier && <TierBadge tier={tier} />}
            </p>
          )}
          <Stars rating={seed.rating} count={seed.reviews}
            label={seed.rating ? tc('rating', { rating: seed.rating.toFixed(1), count: seed.reviews ?? 0 }) : undefined} />

          {failed && <p className="sp-qv__note" role="alert">{t('loadError')}</p>}
          {!product && !failed && (
            <div className="sp-qv__skel" aria-hidden="true" style={{ padding: 0 }}>
              <div className="sp-shimmer" style={{ height: 26, width: '40%', borderRadius: 8 }} />
              <div className="sp-shimmer" style={{ height: 12, width: '95%', borderRadius: 6 }} />
              <div className="sp-shimmer" style={{ height: 12, width: '80%', borderRadius: 6 }} />
            </div>
          )}

          {product && (
            <>
              <ProductPrice product={product} size="lg" pack />
              <p className={`sp-qv__stock${soldOut ? ' is-out' : ''}`}>{soldOut ? tp('soldOut') : t('inStock')}</p>
              {(product.short_description || product.description) && (
                <p className="sp-qv__desc">{product.short_description || product.description}</p>
              )}
              {needsOptions && <p className="sp-qv__note">{t('options')}</p>}
            </>
          )}

          <div className="sp-qv__actions">
            <button type="button" className="sp-btn sp-btn--primary" onClick={add} disabled={!product || soldOut || adding}>
              {added ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
              {added ? tc('added') : needsOptions ? tc('chooseOptions') : tp('addToCart')}
            </button>
            {product && (
              <button type="button" className={`sp-qv__fav${fav ? ' is-on' : ''}`} aria-pressed={fav}
                aria-label={fav ? tc('removeFavorite') : tp('wishlist')} onClick={() => toggleFavorite(product.id)}>
                <Heart size={18} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            )}
          </div>
          <Link href={`/products/${seed.slug}`} className="sp-qv__more">{t('viewDetails')}</Link>
        </div>
      </div>
    </div>
  )
}
