'use client'

/**
 * Product card for every /shop row and the catalogue grid.
 * Builds on the homepage feed card (sponsored label + impression/click tracking,
 * section click tracking, promo badges) and adds: second image on hover, quick
 * view, add to cart, favourite with a heart pop, rating stars and the shop's
 * pepper tier. next/image keeps images lazy, sized and layout-stable.
 *
 * layout="deal" (/deals grid): square image, the caller's offer badge instead of
 * the promo badges, "you save" line and a full-width add-to-cart button.
 */

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Eye, Heart, ShoppingBag, Check, ImageOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import { recordAdClick } from '@/lib/adsApi'
import { useAdImpression } from '@/components/ads/useAdImpression'
import { trackClick } from '@/lib/tracking'
import ProductPrice, { ProductPromoBadges, ProductPromoOverlay, promoPricing } from '@/app/components/promotions/ProductPrice'
import { useFormat } from '@/lib/i18n/useFormat'
import type { ShopProduct } from '@/lib/shopPageApi'
import { ShopAvatar, Stars, TierBadge, asTier } from './primitives'
import { resolveImageUrl } from '@/lib/dealsApi'
import { useQuickView } from './QuickView'

const SIZES = '(min-width: 1700px) 18vw, (min-width: 1280px) 22vw, (min-width: 640px) 30vw, 48vw'

export default function ShopProductCard({ product, index = 0, section, eager = false, footer, layout = 'default', badge }: {
  product: ShopProduct
  index?: number
  /** Tracking source (homepage feed convention: section key). */
  section: string
  /** Above-the-fold images load eagerly. */
  eager?: boolean
  /** Extra line under the price (deal meter…). */
  footer?: ReactNode
  /** "deal": square image, savings line, full-width add-to-cart (the /deals grid). */
  layout?: 'default' | 'deal'
  /** Replaces the promo badges top-left (the /deals offer badge). */
  badge?: ReactNode
}) {
  const t  = useTranslations('productCard')
  const tc = useTranslations('shopPage.card')
  const ta = useTranslations('ads')
  const router = useRouter()
  const pathname = usePathname()
  const fmt = useFormat()
  const openQuick = useQuickView()
  const { addToCart, isFavorited, toggleFavorite, notify } = useCart()
  const ref = useRef<HTMLElement>(null)
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [pop, setPop] = useState(false)

  const isPaid = !!product.is_sponsored && product.placement === 'sponsored'
  const adToken = isPaid ? (product.sponsor_data?.token ?? product.ad_token) : undefined
  useAdImpression(ref, adToken)

  const images: string[] = []
  for (const u of [product.primary_image_url, ...(product.variant_images ?? [])]) {
    if (u && !images.includes(u) && !broken[u]) images.push(u)
  }
  const [main, alt] = images
  const href = `/products/${product.slug}`
  const soldOut = product.stock <= 0
  const variants = product.variants ?? []
  const needsOptions = variants.length > 1
  const fav = isFavorited(product.id)
  const tier = asTier(product.seller?.plan)
  const shop = product.seller?.business_name || product.seller?.name
  const isDeal = layout === 'deal'
  const pricing = promoPricing(product)
  const savings = pricing.hasDiscount ? pricing.original - pricing.final : 0

  const onOpen = () => {
    trackClick(product.id, section)
    if (adToken) recordAdClick(adToken)
  }

  const onFav = async () => {
    if (!fav && isAuthenticated()) { setPop(true); setTimeout(() => setPop(false), 520) }
    await toggleFavorite(product.id)
  }

  const onAdd = async () => {
    if (adding || soldOut) return
    if (needsOptions) { onOpen(); router.push(href); return }
    if (!isAuthenticated()) { router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/shop')}`); return }
    setAdding(true)
    try {
      if (await addToCart(product.id, 1, variants.length === 1 ? variants[0].id : null)) {
        notify(tc('addedToast', { name: product.name }))
        setAdded(true)
        setTimeout(() => setAdded(false), 1800)
      }
    } finally { setAdding(false) }
  }

  const onQuick = () => {
    onOpen()
    openQuick({ slug: product.slug, name: product.name, image: main ?? null, plan: product.seller?.plan, rating: product.avg_rating, reviews: product.reviews_count })
  }

  return (
    <article ref={ref} className={`sp-card sp-card-enter${alt ? ' has-alt' : ''}${isDeal ? ' sp-card--deal' : ''}`} style={{ '--i': index % 12 } as CSSProperties}>
      {/* The whole card is the product link; buttons sit above it. */}
      <Link href={href} prefetch={false} className="sp-card__link" aria-label={product.name} onClick={onOpen} />

      <div className="sp-card__media">
        {main ? (
          <>
            <Image className="sp-card__img sp-card__img--main" src={main} unoptimized={isLocalImage(main)} alt={product.name} fill sizes={SIZES}
              loading={eager ? 'eager' : 'lazy'} priority={eager && index < 2} onError={() => setBroken(b => ({ ...b, [main]: true }))} />
            {alt && (
              <Image className="sp-card__img sp-card__img--alt" src={alt} unoptimized={isLocalImage(alt)} alt="" fill sizes={SIZES} loading="lazy"
                onError={() => setBroken(b => ({ ...b, [alt]: true }))} />
            )}
          </>
        ) : (
          <div className="sp-card__ph"><ImageOff size={28} aria-hidden="true" /><span style={{ fontSize: 10, fontWeight: 700 }}>{t('noImage')}</span></div>
        )}

        <div className="sp-card__badges">
          {isPaid && <span className="sp-pill sp-pill--sponsored">{ta('sponsored')}</span>}
          {badge ?? <ProductPromoBadges product={product} inline />}
        </div>
        {!isDeal && <ProductPromoOverlay product={product} badges={false} />}

        {soldOut && <div className="sp-card__soldout"><span>{t('soldOut')}</span></div>}

        <button type="button" className={`sp-card__fav${fav ? ' is-on' : ''}${pop ? ' is-pop' : ''}`}
          aria-pressed={fav} aria-label={fav ? tc('removeFavorite') : t('wishlist')} onClick={onFav}>
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        <div className="sp-card__actions">
          <button type="button" className="sp-card__act sp-card__act--icon" onClick={onQuick} aria-label={t('quickView')} title={t('quickView')}>
            <Eye size={16} aria-hidden="true" />
          </button>
          {!soldOut && !isDeal && (
            <button type="button" className={`sp-card__act sp-card__act--cart${added ? ' is-done' : ''}`} onClick={onAdd} disabled={adding}
              aria-label={needsOptions ? tc('chooseOptions') : t('addToCart')}>
              {added ? <Check size={15} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}
              <span className="sp-card__act--label">{added ? tc('added') : needsOptions ? tc('chooseOptions') : t('addToCart')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="sp-card__body">
        {(shop || tier) && (
          <p className="sp-card__shop">
            {isDeal
              ? shop && <ShopAvatar name={shop} src={resolveImageUrl(product.seller?.avatar)} />
              : tier && <TierBadge tier={tier} iconOnly />}
            {product.seller?.id && isDeal
              ? <Link href={`/sellers/${product.seller.id}`} prefetch={false} className="sp-card__shoplink">{shop}</Link>
              : <span>{shop}</span>}
          </p>
        )}
        <h3 className="sp-card__name">{product.name}</h3>
        <div className="sp-card__rating">
          <Stars rating={product.avg_rating} count={product.reviews_count}
            label={product.avg_rating ? tc('rating', { rating: product.avg_rating.toFixed(1), count: product.reviews_count ?? 0 }) : undefined} />
        </div>
        <div className="sp-card__price">
          <ProductPrice product={product} size="md" pack />
        </div>
        {isDeal && savings > 0.0005 && <p className="sp-card__save">{tc('save', { amount: fmt.price(savings) })}</p>}
        {!soldOut && product.stock <= 5 && <p className="sp-card__low">{t('onlyLeft', { count: product.stock })}</p>}
        {footer}
        {isDeal && (
          <button type="button" className={`sp-card__cta${added ? ' is-done' : ''}`} onClick={onAdd} disabled={adding || soldOut}>
            {added ? <Check size={15} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}
            {soldOut ? t('soldOut') : added ? tc('added') : needsOptions ? tc('chooseOptions') : t('addToCart')}
          </button>
        )}
      </div>
    </article>
  )
}
