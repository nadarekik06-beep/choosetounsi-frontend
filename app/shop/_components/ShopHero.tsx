'use client'

import { useEffect, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from 'react'
import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, Zap, Clock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import { useFormat } from '@/lib/i18n/useFormat'
import CountUp from '@/app/components/home/CountUp'
import AnimatedPepper from '@/app/components/home/illustrations/AnimatedPepper'
import ProductPrice, { promoPricing } from '@/app/components/promotions/ProductPrice'
import { categoryName, type ShopOverview } from '@/lib/shopPageApi'
import { TimeLeft } from './primitives'

// Decorative embers (fixed positions → no hydration drift)
const SPARKS = [
  { l: '8%',  t: '78%', d: 7,   delay: 0,   c: '#ff5a6e' },
  { l: '22%', t: '90%', d: 9,   delay: 2.4, c: '#4fd37f' },
  { l: '38%', t: '70%', d: 8,   delay: 4.1, c: '#ff5a6e' },
  { l: '55%', t: '88%', d: 10,  delay: 1.2, c: '#fbbf24' },
  { l: '68%', t: '76%', d: 7.5, delay: 3.3, c: '#ff5a6e' },
  { l: '82%', t: '92%', d: 9.5, delay: 5.2, c: '#4fd37f' },
  { l: '93%', t: '68%', d: 8.5, delay: 0.8, c: '#ff5a6e' },
]
const SPOT_MS = 5000
const noopSubscribe = () => () => {}

function Spotlight({ deals }: { deals: ShopOverview['deals'] }) {
  const t  = useTranslations('shopPage.hero')
  const tp = useTranslations('productCard')
  const reduced = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const items = deals.slice(0, 4)

  useEffect(() => {
    if (reduced || paused || items.length < 2) return
    const id = window.setInterval(() => setIdx(i => (i + 1) % items.length), SPOT_MS)
    return () => window.clearInterval(id)
  }, [reduced, paused, items.length])

  const deal = items[idx]
  if (!deal) return null
  const pricing = promoPricing(deal)

  return (
    <div className="sp-spot sp-hero__in" style={{ '--i': 3 } as CSSProperties}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="sp-spot__peps" aria-hidden="true">
        <AnimatedPepper color="red" size={44} rotate={-25} delay={-1} style={{ top: '-2%', insetInlineStart: '-2%' }} />
        <AnimatedPepper color="green" size={30} rotate={40} delay={-3.2} style={{ bottom: '18%', insetInlineEnd: '-3%' }} />
        <AnimatedPepper color="black" size={26} rotate={70} delay={-5} style={{ bottom: '-2%', insetInlineStart: '30%' }} />
      </div>
      <Link key={deal.id} href={`/products/${deal.slug}`} className="sp-spot__card sp-spot__fade" aria-roledescription="slide"
        aria-label={`${t('spotlight')}: ${deal.name}`}>
        <div className="sp-spot__media">
          {deal.primary_image_url && <Image src={deal.primary_image_url} unoptimized={isLocalImage(deal.primary_image_url)} alt="" fill priority sizes="(min-width: 1024px) 440px, 90vw" />}
          <span className="sp-spot__label">
            {deal.deal.is_flash_sale ? <Zap size={12} aria-hidden="true" /> : <Sparkles size={12} aria-hidden="true" />}
            {deal.deal.is_flash_sale ? tp('flashSale') : t('spotlight')}
          </span>
          {pricing.percent > 0 && <span className="sp-spot__pct ltr-iso">-{pricing.percent}%</span>}
        </div>
        <div className="sp-spot__body">
          <p className="sp-spot__name">{deal.name}</p>
          <div className="sp-spot__row">
            <ProductPrice product={deal} size="lg" />
            <span className="sp-spot__timer"><Clock size={13} aria-hidden="true" /><TimeLeft endsAt={deal.deal.ends_at} /></span>
          </div>
        </div>
      </Link>
      {items.length > 1 && (
        <div className="sp-spot__nav" role="group" aria-label={t('spotlight')}>
          {items.map((d, i) => (
            <button key={d.id} type="button" className={`sp-spot__dot${i === idx ? ' is-on' : ''}`}
              aria-label={`${i + 1} / ${items.length}`} aria-current={i === idx} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ShopHero({ overview }: { overview: ShopOverview | null }) {
  const t = useTranslations('shopPage.hero')
  const locale = useLocale()
  const fmt = useFormat()
  const router = useRouter()
  const { ref, inView, seen } = useInView<HTMLElement>({ threshold: 0.05 })
  const [q, setQ] = useState('')
  // Today's date from the visitor's clock (null while hydrating, so server and client agree)
  const today = useSyncExternalStore(noopSubscribe, () => fmt.date(new Date(), 'dayMonth'), () => null)

  const stats = overview?.stats
  const statItems = stats ? [
    { key: 'statProducts', end: stats.products },
    { key: 'statSellers', end: stats.sellers },
    { key: 'statRating', end: stats.average_rating ?? 0, decimals: 1, suffix: '★' },
    { key: 'statCategories', end: stats.categories },
  ].filter(s => s.end > 0) : []
  const chips = [...(overview?.categories ?? [])].sort((a, b) => b.products_count - a.products_count).slice(0, 6)
  const deals = overview?.deals ?? []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '#catalog')
  }

  return (
    <section ref={ref} className={`sp-hero${inView ? ' is-live' : ''}`} aria-labelledby="sp-hero-title">
      <div className="sp-hero__grid-bg" aria-hidden="true" />
      <div className="sp-hero__sparks" aria-hidden="true">
        {SPARKS.map((s, i) => (
          <i key={i} className="sp-spark" style={{ left: s.l, top: s.t, '--d': `${s.d}s`, '--delay': `${s.delay}s`, '--c': s.c } as CSSProperties} />
        ))}
      </div>

      <div className="sp-container sp-hero__layout">
        <div className="sp-hero__copy">
          <div className="sp-hero__in" style={{ '--i': 0 } as CSSProperties}>
            <span className="sp-live">
              <span className="sp-live__dot" aria-hidden="true" />
              <span>{today ? t('live', { date: today }) : t('live', { date: '' }).replace(/\s*·\s*$/, '')}</span>
            </span>
          </div>
          <h1 id="sp-hero-title" className="sp-hero__title sp-hero__in" style={{ '--i': 1 } as CSSProperties}>
            {t('title1')}<br /><em>{t('title2')}</em>
          </h1>
          <p className="sp-hero__lead sp-hero__in" style={{ '--i': 2 } as CSSProperties}>{t('lead')}</p>

          <form className="sp-search sp-hero__in" style={{ '--i': 3 } as CSSProperties} role="search" onSubmit={submit}>
            <Search size={18} className="sp-search__icon" aria-hidden="true" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')} enterKeyHint="search" />
            <button type="submit" className="sp-btn sp-btn--primary">{t('searchCta')}</button>
          </form>
          <div className="sp-hero__actions sp-hero__in" style={{ '--i': 4 } as CSSProperties}>
            <button type="button" className="sp-btn sp-btn--glass" onClick={() => window.dispatchEvent(new Event('open-support-chat'))}>
              <Sparkles size={15} aria-hidden="true" />{t('askAi')}
            </button>
          </div>

          {chips.length > 0 && (
            <nav className="sp-chips sp-hero__in" style={{ '--i': 5 } as CSSProperties} aria-label={t('chipsLabel')}>
              {chips.map((c, i) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="sp-chip" style={{ '--i': i } as CSSProperties}>
                  {c.icon && <span aria-hidden="true">{c.icon}</span>}
                  {categoryName(c, locale)}
                  <span className="sp-chip__n ltr-iso">{fmt.number(c.products_count)}</span>
                </Link>
              ))}
            </nav>
          )}

          {statItems.length > 0 && (
            <ul className="sp-stats sp-hero__in" style={{ '--i': 6 } as CSSProperties} aria-label={t('statsLabel')}>
              {statItems.map(s => (
                <li key={s.key} className="sp-stat">
                  <div className="sp-stat__num">
                    <CountUp end={s.end} start={seen} decimals={s.decimals} suffix={s.suffix}
                      format={n => fmt.number(n, { minimumFractionDigits: s.decimals ?? 0, maximumFractionDigits: s.decimals ?? 0 })} />
                  </div>
                  <div className="sp-stat__label">{t(s.key)}</div>
                </li>
              ))}
            </ul>
          )}
          {!overview && (
            <div className="sp-stats" aria-hidden="true">
              {[0, 1, 2, 3].map(i => <div key={i} className="sp-stat" style={{ height: 66 }} />)}
            </div>
          )}
        </div>

        {deals.length > 0 ? <Spotlight deals={deals} /> : (
          <div className="sp-stage sp-hero__in" style={{ '--i': 3 } as CSSProperties} aria-hidden="true">
            <span className="sp-stage__ring" />
            <AnimatedPepper color="red" size={120} rotate={-18} delay={-1} style={{ top: '18%', insetInlineStart: '22%' }} />
            <AnimatedPepper color="green" size={84} rotate={32} delay={-3} style={{ bottom: '16%', insetInlineEnd: '18%' }} />
            <AnimatedPepper color="black" size={64} rotate={64} delay={-4.6} style={{ top: '14%', insetInlineEnd: '20%' }} />
          </div>
        )}
      </div>
    </section>
  )
}
