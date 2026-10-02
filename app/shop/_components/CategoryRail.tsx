'use client'

import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { categoryName, type ShopCategory } from '@/lib/shopPageApi'
import { ArrowIcon, Rail, Reveal, SectionHead } from './primitives'

/** Every category that has something on sale, with its most viewed product as cover. */
export default function CategoryRail({ categories }: { categories: ShopCategory[] | null }) {
  const t = useTranslations('shopPage.categories')
  const locale = useLocale()

  if (categories && categories.length === 0) return null

  return (
    <section className="sp-section sp-section--tight" aria-labelledby="sp-cats-title">
      <div className="sp-container">
        <SectionHead id="sp-cats-title" eyebrow={t('eyebrow')} line1={t('title1')} line2={t('title2')} />
        <Rail label={t('eyebrow')}>
          {!categories
            ? Array.from({ length: 7 }, (_, i) => (
              <div key={i} role="listitem" className="sp-cat sp-shimmer" aria-hidden="true" />
            ))
            : categories.map((c, i) => {
              const name = categoryName(c, locale)
              return (
                <Reveal key={c.id} index={i} role="listitem">
                  <Link href={`/category/${c.slug}`} className={`sp-cat${c.cover ? '' : ' sp-cat--empty'}`}>
                    {c.cover && <Image className="sp-cat__img" src={c.cover} unoptimized={isLocalImage(c.cover)} alt="" fill sizes="190px" />}
                    {c.icon && <span className="sp-cat__icon" aria-hidden="true">{c.icon}</span>}
                    <span className="sp-cat__go" aria-hidden="true"><ArrowIcon size={13} /></span>
                    <span className="sp-cat__name">{name}</span>
                    <span className="sp-cat__count">{t('count', { count: c.products_count })}</span>
                  </Link>
                </Reveal>
              )
            })}
        </Rail>
      </div>
    </section>
  )
}
