'use client'

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import type { DailyPoint } from '@/lib/sellerAdsApi'
import { usePalette } from './ui'

/** Spend vs. sales per day, plus clicks — the ads home and campaign pages. */
export default function DailyChart({ data, height = 220 }: { data: DailyPoint[]; height?: number }) {
  const t   = useTranslations('seller.ads')
  const fmt = useFormat()
  const p   = usePalette()

  if (!data.length) {
    return <p style={{ fontSize: 13, color: p.muted, margin: 0, padding: '24px 0', textAlign: 'center' }}>{t('detail.noData')}</p>
  }

  const rows = data.map(d => ({ ...d, label: fmt.date(d.date, { day: 'numeric', month: 'short' }) }))

  return (
    <div style={{ width: '100%', height, direction: 'ltr' }}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={p.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: p.muted }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis yAxisId="money" tick={{ fontSize: 10, fill: p.muted }} tickLine={false} axisLine={false} width={48} />
          <YAxis yAxisId="clicks" orientation="right" hide />
          <Tooltip
            contentStyle={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: 10, fontSize: 12, color: p.text }}
            formatter={(value, name) => [name === t('kpis.clicks') ? fmt.number(Number(value)) : fmt.price(Number(value)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area yAxisId="money" type="monotone" dataKey="revenue" name={t('kpis.revenue')} stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} strokeWidth={2} />
          <Area yAxisId="money" type="monotone" dataKey="cost" name={t('kpis.spend')} stroke="#db142e" fill="#db142e" fillOpacity={0.12} strokeWidth={2} />
          <Area yAxisId="clicks" type="monotone" dataKey="clicks" name={t('kpis.clicks')} stroke="#6366f1" fill="none" strokeDasharray="4 3" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
