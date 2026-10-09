'use client';

/**
 * "Stock par variante" card of the seller product page: one row per variant
 * (color swatch / attribute label, stock, price when it differs, SKU, status).
 * Low → orange, out of stock → red "Rupture", inactive → greyed.
 * Data: GET /api/seller/products/{id} → stock_breakdown (total = active variants).
 */

import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';
import type { StockBreakdown, StockBreakdownVariant, StockState } from '@/types/seller';
import { useFormat } from '@/lib/i18n/useFormat';

const STATE_STYLE: Record<StockState, { row: string; num: string; badge: string }> = {
  out:      { row: 'border-s-red-500 bg-red-50/60',      num: 'text-red-600',     badge: 'bg-red-50 text-red-600 border border-red-200' },
  low:      { row: 'border-s-amber-500 bg-amber-50/60',  num: 'text-amber-600',   badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  ok:       { row: 'border-s-transparent',               num: 'text-slate-800',   badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  inactive: { row: 'border-s-transparent opacity-50',    num: 'text-slate-400',   badge: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

function Swatches({ v }: { v: StockBreakdownVariant }) {
  const colors = v.options.filter((o) => o.attribute === 'color');
  if (!colors.length) {
    return (
      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Layers size={11} className="text-slate-400" />
      </span>
    );
  }
  return (
    <span className="flex -space-x-1.5 rtl:space-x-reverse flex-shrink-0">
      {colors.map((c, i) => (
        <span
          key={i}
          title={c.value}
          className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"
          style={{ background: c.color_hex ?? '#e2e8f0' }}
        />
      ))}
    </span>
  );
}

export default function StockByVariant({ breakdown }: { breakdown: StockBreakdown }) {
  const t = useTranslations('seller.productDetail');
  const { price } = useFormat();

  const stateLabel = (s: StockState) =>
    s === 'out' ? t('stockOut') : s === 'low' ? t('stockLow') : s === 'inactive' ? t('variantInactive') : t('stockOk');

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('stockByVariant')}</h3>
        <div className="flex gap-1.5 flex-wrap">
          {breakdown.out_count > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              {t('outCount', { count: breakdown.out_count })}
            </span>
          )}
          {breakdown.low_count > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t('lowCount', { count: breakdown.low_count })}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        {breakdown.threshold_source === 'product'
          ? t('thresholdProduct', { n: breakdown.threshold })
          : t('thresholdShop', { n: breakdown.threshold })}
      </p>

      <ul className="space-y-1.5" aria-label={t('stockByVariant')}>
        {breakdown.variants.map((v) => {
          const st = STATE_STYLE[v.state];
          return (
            <li
              key={v.id}
              className={`flex items-center gap-3 rounded-xl border border-slate-100 border-s-4 px-3 py-2 ${st.row}`}
            >
              <Swatches v={v} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-slate-800 truncate ${v.is_active ? '' : 'line-through decoration-slate-300'}`} dir="auto">
                  {v.label || `#${v.id}`}
                </p>
                {(v.sku || v.price !== null) && (
                  <p className="text-[10px] text-slate-400 truncate">
                    {v.sku && <span className="font-mono" dir="ltr">{t('variantSku', { sku: v.sku })}</span>}
                    {v.sku && v.price !== null && ' · '}
                    {v.price !== null && t('variantPrice', { price: price(v.price) })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className={`text-base font-black tabular-nums leading-none ${st.num}`}>{v.stock}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.badge}`}>{stateLabel(v.state)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500">{t('stockTotalActive')}</span>
        <span className="text-sm font-black text-slate-900 tabular-nums">{t('pieces', { count: breakdown.total })}</span>
      </div>
    </div>
  );
}
