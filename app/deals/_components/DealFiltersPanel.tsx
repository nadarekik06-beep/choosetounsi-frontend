'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, LayoutGrid, Package, Tag, Ticket, X, Zap, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import { DISCOUNT_STEPS, SORT_KEYS, type DealFilters, type TypeFilter } from './model'

export interface FacetOption { id: number; label: string; count: number }
export interface Facets {
  types: Record<TypeFilter, number>
  cats: FacetOption[]
  disc: Record<number, number>
  bounds: { min: number; max: number }
}

export const TYPE_ORDER: TypeFilter[] = ['all', 'flash', 'promo', 'pack', 'coupon']
export const TYPE_ICON: Record<TypeFilter, LucideIcon> = { all: LayoutGrid, flash: Zap, promo: Tag, pack: Package, coupon: Ticket }

/** Offer type line icon, 16px, inherits the text colour. */
export function TypeIcon({ type, size = 16 }: { type: TypeFilter; size?: number }) {
  const Icon = TYPE_ICON[type]
  return <Icon size={size} strokeWidth={2} aria-hidden="true" className="dl-ico" />
}

type Update = (patch: Partial<DealFilters>) => void

function Section({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const bodyId = `${useId()}-${id}`
  return (
    <div className="dlf-sec">
      <button type="button" className="dlf-sec__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown size={14} aria-hidden="true" className={open ? 'is-open' : ''} />
      </button>
      {open && <div id={bodyId} className="dlf-sec__body">{children}</div>}
    </div>
  )
}

function Option({ type, name, checked, onChange, label, count }: {
  type: 'radio' | 'checkbox'; name: string; checked: boolean; onChange: () => void; label: ReactNode; count?: number
}) {
  const empty = count === 0 && !checked
  return (
    <label className={`dlf-opt${checked ? ' is-on' : ''}${empty ? ' is-empty' : ''}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span className="dlf-opt__label">{label}</span>
      {count !== undefined && <span className="dlf-opt__count">{count}</span>}
    </label>
  )
}

/** Two thumbs on one track; commits after the shopper stops moving them (keyed on the committed values, so a reset re-seeds it). */
function PriceRange({ f, bounds, update }: { f: DealFilters; bounds: Facets['bounds']; update: Update }) {
  const tf = useTranslations('filters')
  const { price } = useFormat()
  const lo0 = f.min ?? bounds.min
  const hi0 = f.max ?? bounds.max
  const [lo, setLo] = useState(lo0)
  const [hi, setHi] = useState(hi0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const commit = (nextLo: number, nextHi: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => update({
      min: nextLo <= bounds.min ? null : nextLo,
      max: nextHi >= bounds.max ? null : nextHi,
    }), 350)
  }

  if (bounds.max <= bounds.min) return <p className="dlf-note">{price(bounds.min)}</p>
  const span = bounds.max - bounds.min
  const step = span > 200 ? 5 : 1
  const pct = (v: number) => ((v - bounds.min) / span) * 100

  return (
    <div className="dlf-range">
      <div className="dlf-range__track">
        <span className="dlf-range__fill" style={{ insetInlineStart: `${pct(lo)}%`, insetInlineEnd: `${100 - pct(hi)}%` }} />
        <input type="range" min={bounds.min} max={bounds.max} step={step} value={lo} aria-label={tf('minPrice')}
          onChange={e => { const v = Math.min(Number(e.target.value), hi); setLo(v); commit(v, hi) }} />
        <input type="range" min={bounds.min} max={bounds.max} step={step} value={hi} aria-label={tf('maxPrice')}
          onChange={e => { const v = Math.max(Number(e.target.value), lo); setHi(v); commit(lo, v) }} />
      </div>
      <div className="dlf-range__vals"><span>{price(lo)}</span><span>{price(hi)}</span></div>
    </div>
  )
}

export function FiltersBody({ f, facets, update, clear, hasActive }: {
  f: DealFilters; facets: Facets; update: Update; clear: () => void; hasActive: boolean
}) {
  const t  = useTranslations('deals')
  const tf = useTranslations('filters')
  // Sidebar and bottom sheet both render this: radio groups need their own names
  const uid = useId()
  const [open, setOpen] = useState<Set<string>>(() => new Set(['sort', 'type', 'cat', 'price', 'disc']))
  const toggle = (k: string) => setOpen(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const flip = (list: number[], id: number) => list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  return (
    <>
      <div className="dlf-head">
        <p className="dlf-title">{tf('title')}</p>
        {hasActive && <button type="button" className="dlf-clear" onClick={clear}>{tf('clearFilters')}</button>}
      </div>

      <Section id="sort" title={tf('sortBy')} open={open.has('sort')} onToggle={() => toggle('sort')}>
        {SORT_KEYS.map(k => (
          <Option key={k} type="radio" name={`${uid}-sort`} checked={f.sort === k} onChange={() => update({ sort: k })} label={t(`sort.${k}`)} />
        ))}
      </Section>

      <Section id="type" title={t('dealType')} open={open.has('type')} onToggle={() => toggle('type')}>
        {TYPE_ORDER.map(k => (
          <Option key={k} type="radio" name={`${uid}-type`} checked={f.type === k} onChange={() => update({ type: k })}
            label={<><TypeIcon type={k} /> {t(`tabs.${k}`)}</>} count={facets.types[k]} />
        ))}
      </Section>

      {facets.cats.length > 0 && (
        <Section id="cat" title={tf('category')} open={open.has('cat')} onToggle={() => toggle('cat')}>
          {facets.cats.map(c => (
            <Option key={c.id} type="checkbox" name={`${uid}-cat`} checked={f.cats.includes(c.id)}
              onChange={() => update({ cats: flip(f.cats, c.id) })} label={c.label} count={c.count} />
          ))}
        </Section>
      )}

      <Section id="price" title={tf('priceRange')} open={open.has('price')} onToggle={() => toggle('price')}>
        <PriceRange key={`${f.min}-${f.max}-${facets.bounds.min}-${facets.bounds.max}`} f={f} bounds={facets.bounds} update={update} />
      </Section>

      <Section id="disc" title={t('minDiscount')} open={open.has('disc')} onToggle={() => toggle('disc')}>
        <Option type="radio" name={`${uid}-disc`} checked={f.disc === 0} onChange={() => update({ disc: 0 })} label={t('anyDiscount')} />
        {DISCOUNT_STEPS.map(d => (
          <Option key={d} type="radio" name={`${uid}-disc`} checked={f.disc === d} onChange={() => update({ disc: d })}
            label={t('discountAtLeast', { percent: d })} count={facets.disc[d]} />
        ))}
      </Section>
    </>
  )
}

/** Mobile: the same filters in a bottom sheet. Escape or the backdrop closes it. */
export function FilterSheet({ open, onClose, resultCount, children }: {
  open: boolean; onClose: () => void; resultCount: number; children: ReactNode
}) {
  const t = useTranslations('deals')
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="dlf-sheet" role="dialog" aria-modal="true" aria-label={t('filters')}>
      <div className="dlf-sheet__bd" onClick={onClose} />
      <div className="dlf-sheet__panel" ref={panel} tabIndex={-1}>
        <div className="dlf-sheet__grip" aria-hidden="true" />
        <button type="button" className="dlf-sheet__close" onClick={onClose} aria-label={t('closeFilters')}><X size={18} /></button>
        <div className="dlf-sheet__scroll">{children}</div>
        <div className="dlf-sheet__foot">
          <button type="button" className="dlf-sheet__apply" onClick={onClose}>{t('seeResults', { count: resultCount })}</button>
        </div>
      </div>
    </div>
  )
}
