'use client'

/**
 * Ads home — wallet, last 30 days, campaigns, products worth boosting.
 * Campaigns are CPC: the wallet pays per click, capped by each daily budget.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Megaphone, Plus, Wallet as WalletIcon } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import {
  sellerAdsApi, type AdsSellerConfig, type Campaign, type Overview, type Suggestion, type Wallet,
} from '@/lib/sellerAdsApi'
import DailyChart from './_components/DailyChart'
import { Button, Kpi, Notice, PageFrame, Panel, StatusChip, usePalette, GOLD } from './_components/ui'

export default function AdsHomePage() {
  const t   = useTranslations('seller.ads')
  const fmt = useFormat()
  const p   = usePalette()

  const [wallet, setWallet]       = useState<Wallet | null>(null)
  const [config, setConfig]       = useState<AdsSellerConfig | null>(null)
  const [overview, setOverview]   = useState<Overview | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [w, c, o, list] = await Promise.all([
        sellerAdsApi.wallet(), sellerAdsApi.config(), sellerAdsApi.overview(30), sellerAdsApi.campaigns(),
      ])
      setWallet(w); setConfig(c); setOverview(o); setCampaigns(list.data)
      sellerAdsApi.suggestions().then(setSuggestions).catch(() => setSuggestions([]))
    } catch (e: any) {
      setError(e?.message ?? t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const money = (v: number | null | undefined) => (v == null ? '—' : fmt.price(v))
  const tot = overview?.totals

  return (
    <PageFrame
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Megaphone size={20} color={GOLD} />{t('title')}</span>}
      subtitle={t('subtitle')}
      actions={<Button href="/seller/promote/new"><Plus size={15} />{t('newCampaign')}</Button>}
    >
      {error && <Notice tone="error">{error} <button onClick={load} style={{ marginInlineStart: 8, background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>{t('retry')}</button></Notice>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        {/* Wallet */}
        <Panel title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WalletIcon size={16} />{t('wallet.title')}</span>}
          action={<Link href="/seller/promote/wallet" style={{ fontSize: 12, fontWeight: 800, color: p.gold, textDecoration: 'none' }}>{t('wallet.history')}</Link>}>
          {loading && !wallet ? <p style={{ color: p.muted, fontSize: 13 }}>{t('loading')}</p> : wallet && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kpi label={t('wallet.balance')} value={money(wallet.balance)} />
                <Kpi label={t('wallet.credit')} value={money(wallet.credit_balance)}
                  hint={wallet.credit_expires_at ? t('wallet.creditExpires', { date: fmt.date(wallet.credit_expires_at, 'medium') }) : undefined} />
              </div>
              {config && config.monthly_credit > 0 && (
                <p style={{ fontSize: 12, color: p.muted, margin: 0 }}>{t('wallet.monthlyCredit', { amount: money(config.monthly_credit) })}</p>
              )}
              <Button href="/seller/promote/wallet">{t('wallet.topUp')}</Button>
            </div>
          )}
        </Panel>

        {/* Last 30 days */}
        <Panel title={t('kpis.title')} style={{ gridColumn: 'span 1' }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            <Kpi label={t('kpis.spend')} value={money(tot?.spend ?? 0)} />
            <Kpi label={t('kpis.clicks')} value={fmt.number(tot?.clicks ?? 0)} hint={tot?.ctr != null ? `${t('kpis.ctr')} ${fmt.number(tot.ctr * 100, { maximumFractionDigits: 1 })}%` : undefined} />
            <Kpi label={t('kpis.orders')} value={fmt.number(tot?.orders ?? 0)} hint={tot?.cost_per_order != null ? `${t('kpis.costPerOrder')} ${money(tot.cost_per_order)}` : undefined} />
            <Kpi label={t('kpis.revenue')} value={money(tot?.revenue ?? 0)} />
            <Kpi label={t('kpis.roas')} value={tot?.roas != null ? `${fmt.number(tot.roas, { maximumFractionDigits: 2 })}×` : '—'} />
          </div>
        </Panel>
      </div>

      <Panel title={t('kpis.title')}>
        <DailyChart data={overview?.daily ?? []} />
      </Panel>

      {/* Campaigns */}
      <Panel title={t('campaigns.title')}>
        {!loading && campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 8px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: p.muted, margin: 0, maxWidth: 420 }}>{t('campaigns.empty')}</p>
            <Button href="/seller/promote/new"><Plus size={15} />{t('newCampaign')}</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {campaigns.map(c => (
              <Link key={c.id} href={`/seller/promote/campaigns/${c.id}`} style={{
                display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center', textDecoration: 'none',
                background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: 12, padding: 10, color: p.text,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: p.border }}>
                  {c.product?.image_url && <img src={c.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.product?.name ?? `#${c.id}`}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: p.muted }}>
                    <StatusChip campaign={c} />
                    {c.pricing_model === 'cpc' && c.daily_budget != null
                      ? <span>{t('campaigns.perDay', { amount: money(c.daily_budget) })}</span>
                      : <span>{t('campaigns.legacy')}</span>}
                    <span>{t('campaigns.clicks')}: {fmt.number(c.stats.clicks)}</span>
                    <span>{t('campaigns.orders')}: {fmt.number(c.stats.orders)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'end', fontSize: 12, color: p.muted }}>
                  <p style={{ margin: 0, fontWeight: 800, color: p.text }}>{money(c.stats.spend)}</p>
                  {c.status === 'active' && <p style={{ margin: 0 }}>{t('campaigns.today')}: {money(c.spent_today)}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Suggestions (AutoPromotionService) */}
      {suggestions.length > 0 && (
        <Panel title={t('suggestions.title')}>
          <p style={{ fontSize: 12, color: p.muted, margin: '-6px 0 12px' }}>{t('suggestions.subtitle')}</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))' }}>
            {suggestions.slice(0, 6).map(s => (
              <div key={s.product_id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: 12, padding: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: p.border, flexShrink: 0 }}>
                  {typeof s.image_url === 'string' && <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 800, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.product_name}</p>
                  <p style={{ fontSize: 11, color: p.positive, margin: '2px 0 0', fontWeight: 700 }}>{t('suggestions.est', { amount: money(s.estimated_boost_tnd) })}</p>
                </div>
                {s.already_sponsored
                  ? <span style={{ fontSize: 11, fontWeight: 800, color: p.muted }}>{t('suggestions.boosted')}</span>
                  : <Button small href={`/seller/promote/new?product_id=${s.product_id}`}>{t('suggestions.boost')}</Button>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </PageFrame>
  )
}
