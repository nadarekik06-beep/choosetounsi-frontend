'use client'

/**
 * One campaign: results (30-day chart, per placement, ROAS, cost per order),
 * optimizer tips, and controls (edit budget / max CPC / end date, pause, resume, stop).
 */

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { sellerAdsApi, type CampaignFull } from '@/lib/sellerAdsApi'
import DailyChart from '../../_components/DailyChart'
import { Button, Kpi, Notice, PageFrame, Panel, StatusChip, TipList, usePalette, GOLD } from '../../_components/ui'

function CampaignDetail() {
  const t      = useTranslations('seller.ads')
  const fmt    = useFormat()
  const p      = usePalette()
  const id     = Number(useParams<{ id: string }>().id)
  const search = useSearchParams()

  const [c, setC]             = useState<CampaignFull | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [notice, setNotice]   = useState<string | null>(search.get('launched') ? t('wizard.review.launched') : null)
  const [busy, setBusy]       = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ daily: '', cpc: '', end: '' })

  const load = useCallback(async () => {
    try {
      const data = await sellerAdsApi.campaign(id)
      setC(data)
      setForm({ daily: String(data.daily_budget ?? ''), cpc: String(data.max_cpc ?? ''), end: data.end_at ? data.end_at.slice(0, 10) : '' })
    } catch (e: any) {
      setError(e?.message ?? t('error'))
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  const act = async (fn: () => Promise<unknown>, done?: string): Promise<boolean> => {
    setBusy(true); setError(null)
    try {
      await fn()
      await load()
      if (done) setNotice(done)
      return true
    } catch (e: any) {
      setError(e?.message ?? t('error'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const money = (v: number | null | undefined) => (v == null ? '—' : fmt.price(v))
  if (!c) {
    return <PageFrame title={t('title')}>{error ? <Notice tone="error">{error}</Notice> : <p style={{ color: p.muted }}>{t('loading')}</p>}</PageFrame>
  }

  const s = c.summary
  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.input, color: p.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <PageFrame
      title={c.product?.name ?? `#${c.id}`}
      subtitle={<Link href="/seller/promote" style={{ color: p.gold, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} className="rtl-flip" />{t('detail.back')}</Link>}
      actions={
        <>
          {c.can.pause && <Button variant="ghost" disabled={busy} onClick={() => act(() => sellerAdsApi.pause(c.id))}>{t('detail.pause')}</Button>}
          {c.can.resume && <Button disabled={busy} onClick={() => act(() => sellerAdsApi.resume(c.id))}>{t('detail.resume')}</Button>}
          {c.can.cancel && <Button variant="danger" disabled={busy} onClick={() => { if (window.confirm(t('detail.confirmStop'))) act(() => sellerAdsApi.cancel(c.id)) }}>{t('detail.stop')}</Button>}
        </>
      }
    >
      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {c.status === 'rejected' && c.rejection_reason && <Notice tone="error">{t('detail.rejected', { reason: c.rejection_reason })}</Notice>}
      {c.status === 'paused' && c.paused_reason && <Notice tone="warn">{t(`pauseReason.${c.paused_reason}`)}</Notice>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', color: p.muted, fontSize: 13 }}>
        <StatusChip campaign={c} />
        <span>{c.end_at ? t('detail.endsOn', { date: fmt.date(c.end_at, 'medium') }) : t('detail.noEnd')}</span>
        {c.daily_budget != null && <span>{t('campaigns.perDay', { amount: money(c.daily_budget) })}</span>}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <Kpi label={t('kpis.spend')} value={money(s.spend)} hint={s.credit_spend > 0 ? t('detail.creditPart', { amount: money(s.credit_spend) }) : undefined} />
        <Kpi label={t('kpis.impressions')} value={fmt.number(s.impressions)} />
        <Kpi label={t('kpis.clicks')} value={fmt.number(s.clicks)} hint={c.stats.ctr != null ? `${t('kpis.ctr')} ${fmt.number(c.stats.ctr * 100, { maximumFractionDigits: 1 })}%` : undefined} />
        <Kpi label={t('kpis.orders')} value={fmt.number(s.orders)} />
        <Kpi label={t('kpis.revenue')} value={money(s.revenue)} />
        <Kpi label={t('kpis.roas')} value={s.roas != null ? `${fmt.number(s.roas, { maximumFractionDigits: 2 })}×` : '—'} />
        <Kpi label={t('kpis.costPerOrder')} value={money(s.cost_per_order)} />
      </div>

      <Panel title={t('detail.chart')}><DailyChart data={c.daily} /></Panel>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
        <Panel title={t('detail.placements')}>
          {c.placement_stats.length === 0 ? <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>{t('detail.noData')}</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: p.text }}>
                <thead>
                  <tr style={{ color: p.muted, textAlign: 'start' }}>
                    {['', 'impressions', 'clicks', 'spend', 'orders', 'revenue'].map(k => (
                      <th key={k} style={{ textAlign: 'start', padding: '6px 8px', fontWeight: 700 }}>{k ? t(`kpis.${k}`) : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.placement_stats.map(r => (
                    <tr key={r.placement} style={{ borderTop: `1px solid ${p.border}` }}>
                      <td style={{ padding: '7px 8px', fontWeight: 700 }}>{t(`placementNames.${r.placement}`)}</td>
                      <td style={{ padding: '7px 8px' }}>{fmt.number(r.impressions)}</td>
                      <td style={{ padding: '7px 8px' }}>{fmt.number(r.clicks)}</td>
                      <td style={{ padding: '7px 8px' }}>{money(r.cost)}</td>
                      <td style={{ padding: '7px 8px' }}>{fmt.number(r.orders)}</td>
                      <td style={{ padding: '7px 8px' }}>{money(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={t('detail.tips')}>
          {c.tips.length ? <TipList tips={c.tips} productId={c.product?.id} /> : <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>{t('detail.noTips')}</p>}
          {c.ad_copy && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: p.muted, margin: '0 0 4px' }}>{t('detail.adCopy')}</p>
              <p style={{ fontSize: 13, color: p.text, margin: 0, fontStyle: 'italic' }}>{c.ad_copy}</p>
            </div>
          )}
        </Panel>
      </div>

      {c.can.edit && c.pricing_model === 'cpc' && (
        <Panel title={t('detail.edit')} action={!editing && <Button small variant="ghost" onClick={() => setEditing(true)}>{t('detail.edit')}</Button>}>
          {editing && (
            <form onSubmit={e => {
              e.preventDefault()
              act(() => sellerAdsApi.update(c.id, { daily_budget: Number(form.daily), max_cpc: Number(form.cpc), end_date: form.end || null }), t('detail.saved'))
                .then(ok => { if (ok) setEditing(false) })
            }} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', alignItems: 'end' }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('wizard.budget.daily')}
                <input type="number" inputMode="decimal" step="0.5" value={form.daily} onChange={e => setForm(f => ({ ...f, daily: e.target.value }))} style={{ ...inputStyle, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('wizard.budget.maxCpc')}
                <input type="number" inputMode="decimal" step="0.05" value={form.cpc} onChange={e => setForm(f => ({ ...f, cpc: e.target.value }))} style={{ ...inputStyle, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('wizard.budget.duration')}
                <input type="date" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} style={{ ...inputStyle, marginTop: 6 }} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" disabled={busy}>{t('detail.save')}</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>{t('detail.discard')}</Button>
              </div>
            </form>
          )}
        </Panel>
      )}
    </PageFrame>
  )
}

export default function CampaignPage() {
  return (
    <Suspense fallback={null}>
      <CampaignDetail />
    </Suspense>
  )
}
