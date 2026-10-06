'use client'

/**
 * The storefront product card — one component for every product grid and row:
 * search, category pages, homepage feed, /shop, /deals, seller stores,
 * recommendations, brand collection, flash deals, favourites.
 *
 *   - image slider (CardGallery): pointer-follow on desktop, swipe on touch, dots,
 *     extra images only loaded on first hover / touch
 *   - color swatches under the name: hover / tap shows that color's image
 *   - promo badges + flash countdown, favourite with a heart pop, quick view (where a
 *     QuickViewProvider exists), add to cart, rating, shop photo, low-stock line
 *   - paid placements (from the ad server) look exactly like organic cards; their
 *     impression (≥ 50 % visible for 1 s) and click are still reported with the ad token
 *
 * Page-specific bits come in as props: `badge` (TOP 3, NEW, official…), `label`
 * (category eyebrow), `overlay` (rank numeral), `footer`, and `layout`:
 *   default — 4:5 image, actions on hover
 *   deal    — square image, savings line, full-width add to cart (/deals)
 *   row     — horizontal list row (category list view)
 */

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Eye, Heart, ShoppingBag, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/context/CartContext'
import { isAuthenticated } from '@/lib/auth'
import { recordAdClick } from '@/lib/adsApi'
import { useAdImpression } from '@/components/ads/useAdImpression'
import { trackClick } from '@/lib/tracking'
import ProductPrice, { ProductPromoBadges, ProductPromoOverlay, promoPricing } from '@/app/components/promotions/ProductPrice'
import { useFormat } from '@/lib/i18n/useFormat'
import { resolveImageUrl } from '@/lib/dealsApi'
import { ShopAvatar, Stars } from '@/app/shop/_components/primitives'
import { useQuickView } from '@/app/shop/_components/QuickView'
import CardGallery from './CardGallery'
import { cardImages, cardSwatches, type CardProduct } from './cardData'
import './product-card.css'

export type { CardProduct } from './cardData'

const SIZES = '(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 48vw'
const ROW_SIZES = '140px'
const MAX_SWATCHES = 5

/** Current price (bold; red only when discounted), struck-through old price, small -X% tag. */
function CardPrice({ product }: { product: CardProduct }) {
  const fmt = useFormat()
  const { final, original, hasDiscount, percent } = promoPricing(product)
  // Packs keep the shared component: it adds the pack badge and the per-unit price
  if (product.is_pack) return <ProductPrice product={product} size="md" pack />
  return (
    <div className="sp-price">
      <span className={`sp-price__now${hasDiscount ? ' is-sale' : ''}`}>{fmt.price(final)}</span>
      {hasDiscount && <s className="sp-price__was">{fmt.price(original)}</s>}
      {hasDiscount && percent > 0 && <span className="sp-price__pct ltr-iso">-{percent}%</span>}
    </div>
  )
}

export default function ProductCard({
  product, index = 0, section, eager = false, layout = 'default',
  badge, label, overlay, footer, variantId, onFavorite, showShop = true, className = '', href: hrefOverride, onSelect,
}: {
  product: CardProduct
  index?: number
  /** Tracking source (homepage feed convention: section key, e.g. "search", "category"). */
  section: string
  /** Above-the-fold images load eagerly. */
  eager?: boolean
  layout?: 'default' | 'deal' | 'row'
  /** Extra badges top-left, under the promo badges (TOP 3, NEW, official…); on /deals it replaces them. */
  badge?: ReactNode
  /** Small eyebrow above the name (category / subcategory). */
  label?: string | null
  /** Drawn over the image (homepage rank numeral). */
  overlay?: ReactNode
  /** Extra line under the price (deal meter, variant chosen…). */
  footer?: ReactNode
  /** Favourites: the exact variant (cart + heart act on it). */
  variantId?: number | null
  /** Replaces the default favourite toggle. */
  onFavorite?: () => void | Promise<void>
  /** Off inside a seller's own store, where every card is theirs. */
  showShop?: boolean
  /** Product link (default /products/{slug}); photo search adds ?color= for the matched color. */
  href?: string
  /** Called when the card is opened (photo search logs the clicked result). */
  onSelect?: () => void
  className?: string
}) {
  const t  = useTranslations('productCard')
  const tc = useTranslations('shopPage.card')
  const router = useRouter()
  const pathname = usePathname()
  const fmt = useFormat()
  const openQuick = useQuickView()
  const { addToCart, isFavorited, toggleFavorite, notify } = useCart()
  const ref = useRef<HTMLElement>(null)
  const [broken, setBroken] = useState<string[]>([])
  const [swatch, setSwatch] = useState<number | null>(null)   // swatch id shown on the image
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [pop, setPop] = useState(false)

  // Paid placement: no label, but impressions and clicks still go to the ad engine
  const isPaid = !!product.is_sponsored && product.placement === 'sponsored'
  const adToken = isPaid ? (product.sponsor_data?.token ?? product.ad_token) : undefined
  useAdImpression(ref, adToken)

  const allImages = useMemo(() => cardImages(product), [product])
  const images = useMemo(() => allImages.filter(u => !broken.includes(u)), [allImages, broken])
  const swatches = useMemo(() => cardSwatches(product).filter(s => images.includes(s.image)), [product, images])
  const selectedIndex = swatch == null ? null : images.indexOf(swatches.find(s => s.id === swatch)?.image ?? '')

  const href = hrefOverride ?? `/products/${product.slug}`
  const soldOut = product.stock <= 0
  const variants = product.variants ?? []
  // Unknown variants (a payload without them): let the product page ask, never add a bare line
  const needsOptions = variantId == null && (product.variants === undefined || variants.length > 1)
  const fav = variantId != null ? isFavorited(product.id, variantId) : isFavorited(product.id)
  const shop = showShop ? (product.seller?.business_name || product.seller?.name) : null
  const isDeal = layout === 'deal'
  const isRow = layout === 'row'
  const pricing = promoPricing(product)
  const savings = pricing.hasDiscount ? pricing.original - pricing.final : 0

  const onOpen = () => {
    trackClick(product.id, section)
    onSelect?.()
    if (adToken) recordAdClick(adToken)
  }

  const onFav = async () => {
    if (!fav && isAuthenticated()) { setPop(true); setTimeout(() => setPop(false), 520) }
    if (onFavorite) await onFavorite()
    else await toggleFavorite(product.id, variantId ?? undefined)
  }

  const onAdd = async () => {
    if (adding || soldOut) return
    if (needsOptions) { onOpen(); router.push(href); return }
    if (!isAuthenticated()) { router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`); return }
    setAdding(true)
    try {
      const v = variantId ?? (variants.length === 1 ? variants[0].id : null)
      if (await addToCart(product.id, 1, v)) {
        notify(tc('addedToast', { name: product.name }))
        setAdded(true)
        setTimeout(() => setAdded(false), 1800)
      }
    } finally { setAdding(false) }
  }

  const onQuick = openQuick ? () => {
    onOpen()
    openQuick({ slug: product.slug, name: product.name, image: images[0] ?? null, plan: product.seller?.plan, rating: product.avg_rating, reviews: product.reviews_count })
  } : undefined

  const visibleSwatches = swatches.slice(0, MAX_SWATCHES)
  const moreSwatches = swatches.length - visibleSwatches.length

  return (
    <article ref={ref}
      className={`sp-card sp-card-enter${isDeal ? ' sp-card--deal' : ''}${isRow ? ' sp-card--row' : ''}${pricing.isFlash ? ' is-flash' : ''} ${className}`.trim()}
      style={{ '--i': index % 12 } as CSSProperties}
      onMouseLeave={() => setSwatch(null)}>
      {/* The whole card is the product link; buttons sit above it. */}
      <Link href={href} prefetch={false} className="sp-card__link" aria-label={product.name} onClick={onOpen} />

      <CardGallery images={images} alt={product.name} href={href} sizes={isRow ? ROW_SIZES : SIZES}
        eager={eager} priority={eager && index < 2} selected={selectedIndex != null && selectedIndex >= 0 ? selectedIndex : null}
        onOpen={onOpen} onBroken={u => setBroken(b => (b.includes(u) ? b : [...b, u]))} noImageLabel={t('noImage')}>

        <div className="sp-card__badges">
          {/* default layout: the -X% sits next to the price instead */}
          {isDeal ? (badge ?? <ProductPromoBadges product={product} inline />) : badge}
        </div>
        {!isDeal && <ProductPromoOverlay product={product} badges={false} />}
        {overlay}

        {soldOut && <div className="sp-card__soldout"><span>{t('soldOut')}</span></div>}

        <button type="button" className={`sp-card__fav${fav ? ' is-on' : ''}${pop ? ' is-pop' : ''}`}
          aria-pressed={fav} aria-label={fav ? tc('removeFavorite') : t('wishlist')} onClick={onFav}>
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        {!isRow && (
          <div className="sp-card__actions">
            {onQuick && (
              <button type="button" className="sp-card__act sp-card__act--icon" onClick={onQuick} aria-label={t('quickView')} title={t('quickView')}>
                <Eye size={16} aria-hidden="true" />
              </button>
            )}
            {!soldOut && !isDeal && (
              <button type="button" className={`sp-card__act sp-card__act--cart${added ? ' is-done' : ''}`} onClick={onAdd} disabled={adding}
                aria-label={needsOptions ? tc('chooseOptions') : t('addToCart')}>
                {added ? <Check size={15} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}
                <span className="sp-card__act--label">{added ? tc('added') : needsOptions ? tc('chooseOptions') : t('addToCart')}</span>
              </button>
            )}
          </div>
        )}
      </CardGallery>

      <div className="sp-card__body">
        {shop && (
          <p className="sp-card__shop">
            <ShopAvatar name={shop} src={resolveImageUrl(product.seller?.avatar)} size={isDeal ? 22 : 20} />
            {product.seller?.id
              ? <Link href={`/sellers/${product.seller.id}`} prefetch={false} className="sp-card__shoplink">{shop}</Link>
              : <span>{shop}</span>}
          </p>
        )}
        {label && <p className="pc-label">{label}</p>}
        <h3 className="sp-card__name">{product.name}</h3>

        {visibleSwatches.length > 1 && (
          <div className="pc-swatches" onMouseLeave={() => setSwatch(null)}>
            {visibleSwatches.map(s => (
              <button key={s.id} type="button" className={`pc-swatch${swatch === s.id ? ' is-on' : ''}`}
                style={{ '--sw': s.hex || '#d1d5db' } as CSSProperties}
                title={s.name} aria-label={s.name} aria-pressed={swatch === s.id}
                onMouseEnter={() => setSwatch(s.id)} onFocus={() => setSwatch(s.id)}
                onClick={() => setSwatch(cur => (cur === s.id ? null : s.id))}>
                {!s.hex && (
                  // eslint-disable-next-line @next/next/no-img-element -- 16px color chip, no optimizer round-trip
                  <img src={s.image} alt="" loading="lazy" />
                )}
              </button>
            ))}
            {moreSwatches > 0 && <span className="pc-swatch-more ltr-iso">+{moreSwatches}</span>}
          </div>
        )}

        <div className="sp-card__rating">
          <Stars rating={product.avg_rating} count={product.reviews_count}
            label={product.avg_rating ? tc('rating', { rating: product.avg_rating.toFixed(1), count: product.reviews_count ?? 0 }) : undefined} />
        </div>
        <div className="sp-card__price">
          {isDeal ? <ProductPrice product={product} size="md" pack /> : <CardPrice product={product} />}
        </div>
        {isDeal && savings > 0.0005 && <p className="sp-card__save">{tc('save', { amount: fmt.price(savings) })}</p>}
        {!soldOut && product.stock <= 5 && <p className="sp-card__low">{t('onlyLeft', { count: product.stock })}</p>}
        {footer}
        {(isDeal || isRow) && (
          <button type="button" className={`sp-card__cta${added ? ' is-done' : ''}${isRow ? ' sp-card__cta--row' : ''}`} onClick={onAdd} disabled={adding || soldOut}>
            {added ? <Check size={15} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}
            {soldOut ? t('soldOut') : added ? tc('added') : needsOptions ? tc('chooseOptions') : t('addToCart')}
          </button>
        )}
      </div>
    </article>
  )
}

/** Grid placeholder while a list loads (same footprint as a card). */
export function ProductCardSkeleton({ layout = 'default' }: { layout?: 'default' | 'deal' }) {
  return (
    <div className={`pc-skel${layout === 'deal' ? ' pc-skel--deal' : ''}`} aria-hidden="true">
      <div className="pc-skel__media" />
      <div className="pc-skel__line" style={{ width: '45%' }} />
      <div className="pc-skel__line" style={{ width: '80%' }} />
      <div className="pc-skel__line" style={{ width: '35%', marginBottom: 12 }} />
    </div>
  )
}
