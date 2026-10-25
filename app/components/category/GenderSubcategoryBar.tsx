'use client'

// Horizontal round-thumbnail subcategory bar (Trendyol style) shown on a gendered category
// page once Femme or Homme is selected. Arrows on desktop, native swipe on mobile, RTL aware.
// Image order: admin upload → main image of a real product → neutral placeholder icon.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { canScrollNext, canScrollPrev, scrollCarousel } from '@/lib/i18n/rtlScroll'
import { genderHref, localName, useGenderBar, type Gender } from '@/lib/gender'

export default function GenderSubcategoryBar({ categorySlug, gender, activeSub }: {
  categorySlug: string; gender: Gender; activeSub: string
}) {
  const t = useTranslations('category')
  const tm = useTranslations('mega')
  const locale = useLocale()
  const { items, loading } = useGenderBar(categorySlug, gender)
  const ref = useRef<HTMLDivElement>(null)
  const [cl, setCl] = useState(false)
  const [cr, setCr] = useState(false)

  const check = useCallback(() => { const el = ref.current; if (!el) return; setCl(canScrollPrev(el, 6)); setCr(canScrollNext(el, 6)) }, [])
  useEffect(() => {
    const el = ref.current; if (!el) return
    check(); el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check); ro.observe(el)
    return () => { el.removeEventListener('scroll', check); ro.disconnect() }
  }, [items, check])
  // Keep the active subcategory in view
  useEffect(() => {
    const el = ref.current; if (!el || !activeSub) return
    const nd = el.querySelector<HTMLElement>(`[data-sub="${CSS.escape(activeSub)}"]`)
    nd?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeSub, items])

  if (!loading && items.length === 0) return null

  const label = (slug: string, fallback: string) => (tm.has(`items.${slug}`) ? tm(`items.${slug}`) : fallback)

  return (
    <nav className="gsb" aria-label={t('genderBar')}>
      <style>{`
        .gsb{background:#fff;border-bottom:1px solid #eee}
        .gsb-w{max-width:1520px;margin:0 auto;padding:0 6px;display:flex;align-items:center;position:relative}
        .gsb-list{display:flex;gap:6px;flex:1;overflow-x:auto;scrollbar-width:none;padding:12px 4px 10px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
        .gsb-list::-webkit-scrollbar{display:none}
        .gsb-it{flex-shrink:0;width:84px;display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:#374151;scroll-snap-align:start;font-family:'Outfit',sans-serif}
        .gsb-img{width:68px;height:68px;border-radius:50%;background:#f6f6f7;border:2px solid #f0f0f0;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:border-color .15s,transform .15s,box-shadow .15s}
        .gsb-img img{width:100%;height:100%;object-fit:cover;display:block}
        .gsb-it:hover .gsb-img{border-color:#fecaca;transform:translateY(-2px)}
        .gsb-it.on .gsb-img{border-color:#db142e;box-shadow:0 0 0 3px rgba(219,20,46,.15)}
        .gsb-lb{font-size:11.5px;font-weight:600;line-height:1.25;text-align:center;max-width:84px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .gsb-it.on .gsb-lb{color:#db142e;font-weight:800}
        .gsb-arr{flex-shrink:0;width:30px;height:30px;border-radius:50%;border:1px solid #eee;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280;box-shadow:0 2px 8px rgba(0,0,0,.06);opacity:0;pointer-events:none;transition:opacity .2s,color .14s}
        .gsb-arr.show{opacity:1;pointer-events:auto}.gsb-arr:hover{color:#db142e}
        .gsb-sk{width:68px;height:68px;border-radius:50%;background:linear-gradient(90deg,#f3f3f3 25%,#ebebeb 50%,#f3f3f3 75%);background-size:700px 100%;animation:shShimmer 1.4s infinite}
        .gsb-skl{width:52px;height:9px;border-radius:4px;background:#f0f0f0}
        @media(max-width:920px){.gsb-arr{display:none}.gsb-it{width:72px}.gsb-img,.gsb-sk{width:58px;height:58px}.gsb-lb{font-size:11px;max-width:72px}.gsb-list{padding:10px 8px 8px}}
      `}</style>
      <div className="gsb-w">
        <button type="button" className={`gsb-arr${cl ? ' show' : ''}`} onClick={() => ref.current && scrollCarousel(ref.current, 'prev', 300)} aria-label={t('genderBarPrev')}>
          <svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div ref={ref} className="gsb-list">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="gsb-it" aria-hidden="true"><div className="gsb-sk" /><div className="gsb-skl" /></div>
              ))
            : items.map(it => {
                const on = it.slug === activeSub
                const name = label(it.slug, localName(it, locale))
                return (
                  <Link key={it.id} data-sub={it.slug} className={`gsb-it${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}
                    href={on ? genderHref(categorySlug, gender) : genderHref(it.category_slug, gender, it.slug)}>
                    <span className="gsb-img">
                      {it.image
                        ? <img src={it.image} alt="" loading="lazy" draggable={false} />
                        : <Placeholder />}
                    </span>
                    <span className="gsb-lb">{name}</span>
                  </Link>
                )
              })}
        </div>
        <button type="button" className={`gsb-arr${cr ? ' show' : ''}`} onClick={() => ref.current && scrollCarousel(ref.current, 'next', 300)} aria-label={t('genderBarNext')}>
          <svg className="rtl-flip" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </nav>
  )
}

/** Neutral hanger icon when there is no image. */
function Placeholder() {
  return (
    <svg width="28" height="28" fill="none" stroke="#c4c4c8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7.5a2 2 0 1 1 2-2" /><path d="M12 7.5v1.2L3.6 15.4a1.5 1.5 0 0 0 .9 2.6h15a1.5 1.5 0 0 0 .9-2.6L12 8.7" />
    </svg>
  )
}
