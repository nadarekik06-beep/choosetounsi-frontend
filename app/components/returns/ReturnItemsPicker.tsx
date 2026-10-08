'use client'

import { useTranslations } from 'next-intl'
import type { EligibleOrderItem } from '@/types/complaint'
import { PurchasedItemThumb, VariantLabel } from '@/app/components/PurchasedItemRow'
import { useFormat } from '@/lib/i18n/useFormat'

const RED       = '#db142e'
const RED_LIGHT = 'rgba(219,20,46,0.06)'
const BORDER    = '#e2e8f0'
const TEXT      = '#0f172a'
const TEXT_SEC  = '#64748b'

/**
 * What the client sends back: the whole order, or chosen lines with a quantity
 * each (up to what is still returnable). Quantities map: order_item_id → units.
 * The estimate uses the price actually paid (coupon / flash sale included).
 */
export default function ReturnItemsPicker({
  items, returnAll, onReturnAll, quantities, onChange, error,
}: {
  items:       EligibleOrderItem[]
  returnAll:   boolean
  onReturnAll: (v: boolean) => void
  quantities:  Record<number, number>
  onChange:    (q: Record<number, number>) => void
  error?:      string
}) {
  const t = useTranslations('returns.form')
  const { price } = useFormat()

  const units = (i: EligibleOrderItem) => (returnAll ? i.returnable_quantity : quantities[i.id] ?? 0)
  const estimate = items.reduce((s, i) => s + units(i) * (i.paid_unit_price ?? i.unit_price), 0)

  const set = (id: number, qty: number) => {
    const next = { ...quantities }
    if (qty <= 0) delete next[id]
    else next[id] = qty
    onChange(next)
  }

  const scopeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 12.5, fontWeight: 800, textAlign: 'center',
    border: `1.5px solid ${active ? RED : BORDER}`,
    background: active ? RED_LIGHT : '#f8fafc', color: active ? RED : TEXT_SEC,
    boxShadow: active ? `0 0 0 1px ${RED}` : 'none', transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => onReturnAll(true)} aria-pressed={returnAll} style={scopeBtn(returnAll)}>
          📦 {t('wholeOrder')}
        </button>
        <button type="button" onClick={() => onReturnAll(false)} aria-pressed={!returnAll} style={scopeBtn(!returnAll)}>
          ☑️ {t('someItems')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const qty = units(item)
          const sel = qty > 0
          const max = item.returnable_quantity
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
              border: `1.5px solid ${sel ? RED : BORDER}`, background: sel ? RED_LIGHT : '#f8fafc',
              transition: 'all 0.15s',
            }}>
              {!returnAll && (
                <button type="button" aria-pressed={sel} aria-label={item.product_name}
                  onClick={() => set(item.id, sel ? 0 : max)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', padding: 0,
                    border: `2px solid ${sel ? RED : BORDER}`, background: sel ? RED : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {sel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              <PurchasedItemThumb item={item} size={40} border={BORDER} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: sel ? RED : TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product_name}
                </p>
                <p style={{ fontSize: 11, color: TEXT_SEC, margin: '2px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <VariantLabel item={item} color={TEXT_SEC} />
                  <span>{t('paidUnit', { price: price(item.paid_unit_price ?? item.unit_price) })}</span>
                  {max < item.quantity && <span>· {t('returnable', { count: max })}</span>}
                </p>
              </div>
              {/* Quantity stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} aria-label={t('quantity')}>
                <button type="button" disabled={returnAll || qty <= 0} onClick={() => set(item.id, qty - 1)}
                  aria-label="−" style={stepBtn(returnAll || qty <= 0)}>−</button>
                <span style={{ minWidth: 34, textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: TEXT }} dir="ltr">
                  {qty}/{max}
                </span>
                <button type="button" disabled={returnAll || qty >= max} onClick={() => set(item.id, qty + 1)}
                  aria-label="+" style={stepBtn(returnAll || qty >= max)}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {error && <span style={{ fontSize: 11, color: RED, fontWeight: 700, marginTop: 8, display: 'block' }}>⚠ {error}</span>}

      {estimate > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12.5, fontWeight: 700, color: '#047857',
        }}>
          <span>{t('estimate')}</span>
          <span style={{ fontSize: 14, fontWeight: 900 }}>{price(estimate)}</span>
        </div>
      )}
    </div>
  )
}

function stepBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${BORDER}`, background: '#fff',
    color: disabled ? '#cbd5e1' : TEXT, fontWeight: 900, fontSize: 14, lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', padding: 0,
  }
}

/** Items payload for the API from the picker's state. */
export function returnLines(items: EligibleOrderItem[], returnAll: boolean, quantities: Record<number, number>) {
  return items
    .map(i => ({ order_item_id: i.id, quantity: returnAll ? i.returnable_quantity : quantities[i.id] ?? 0 }))
    .filter(l => l.quantity > 0)
}
