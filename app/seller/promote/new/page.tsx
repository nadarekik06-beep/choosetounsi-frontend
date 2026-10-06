'use client'

/**
 * Create-campaign wizard:
 *   1 product → 2 readiness (blockers must be fixed) → 3 budget (daily budget, duration,
 *   max CPC = suggested by default) → 4 audience (automatic by default) → 5 placements
 *   (all by default) → 6 forecast + summary → launch.
 * Nothing is charged at launch; the wallet must hold one day of budget.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { WILAYAS, useWilayaLabel } from '@/lib/i18n/wilayas'
import {
  AdsApiError, sellerAdsApi,
  type AdsSellerConfig, type Forecast, type Placement, type Readiness, type SellerProductLite,
} from '@/lib/sellerAdsApi'
import { Button, Notice, PageFrame, Panel, TipList, usePalette, GOLD, RED } from '../_components/ui'
import { RouteLoading } from '@/components/brand/NavigationLoader'
import BrandLoader from '@/components/brand/BrandLoader'

const STEPS = ['product', 'readiness', 'budget', 'audience', 'placements', 'review'] as const
type Step = typeof STEPS[number]
const DURATIONS = [0, 7, 14, 30] as const   // 0 = until stopped

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days - 1)   // the last day is included
  return d.toISOString().slice(0, 10)
}

function Wizard() {
  const t      = useTranslations('seller.ads')
  const fmt    = useFormat()
  const p      = usePalette()
  const wl     = useWilayaLabel()
  const router = useRouter()
  const search = useSearchParams()

  const [step, setStep]           = useState<Step>('product')
  const [products, setProducts]   = useState<SellerProductLite[]>([])
  const [busyIds, setBusyIds]     = useState<Set<number>>(new Set())
  const [query, setQuery]         = useState('')
  const [productId, setProductId] = useState<number | null>(null)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [config, setConfig]       = useState<AdsSellerConfig | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  const [daily, setDaily]         = useState('')
  const [days, setDays]           = useState<number>(0)
  const [maxCpc, setMaxCpc]       = useState('')
  const [total, setTotal]         = useState('')
  const [advanced, setAdvanced]   = useState(false)

  const [manual, setManual]       = useState(false)
  const [gender, setGender]       = useState('')
  const [wilayas, setWilayas]     = useState<string[]>([])
  const [cats, setCats]           = useState<number[]>([])
  const [priceMin, setPriceMin]   = useState('')
  const [priceMax, setPriceMax]   = useState('')

  const [allPlacements, setAllPlacements] = useState(true)
  const [placements, setPlacements] = useState<Placement[]>([])

  const [forecast, setForecast]   = useState<Forecast | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const product = products.find(x => x.id === productId) ?? null
  const money = (v: number | null | undefined) => (v == null ? '—' : fmt.price(v))

  useEffect(() => {
    Promise.all([sellerAdsApi.products(), sellerAdsApi.campaigns('draft,active,paused')])
      .then(([list, open]) => {
        setProducts(list)
        setBusyIds(new Set(open.data.map(c => c.product?.id).filter((x): x is number => !!x)))
        const pre = Number(search.get('product_id'))
        if (pre && list.some(x => x.id === pre)) setProductId(pre)
      })
      .catch(e => setError(e?.message ?? t('error')))
    sellerAdsApi.categories().then(setCategories).catch(() => {})
  }, [search, t])

  const checkReadiness = useCallback(async (id: number) => {
    setLoading(true); setError(null)
    try {
      const [r, c] = await Promise.all([sellerAdsApi.readiness(id), sellerAdsApi.config(id)])
      setReadiness(r); setConfig(c)
      setDaily(v => v || String(Math.max(c.min_daily_budget, 5)))
      setMaxCpc(String(c.suggested_cpc))
    } catch (e: any) {
      setError(e?.message ?? t('error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const payload = useMemo(() => ({
    product_id: productId ?? undefined,
    daily_budget: Number(daily),
    max_cpc: maxCpc ? Number(maxCpc) : null,
    total_budget: total ? Number(total) : null,
    end_date: days ? addDays(days) : null,
    placements: allPlacements ? null : placements,
    ...(manual ? {
      target_gender: gender || null,
      target_wilaya_ids: wilayas.length ? wilayas : null,
      target_category_ids: cats.length ? cats : null,
      target_price_min: priceMin ? Number(priceMin) : null,
      target_price_max: priceMax ? Number(priceMax) : null,
    } : {}),
  }), [productId, daily, maxCpc, total, days, allPlacements, placements, manual, gender, wilayas, cats, priceMin, priceMax])

  useEffect(() => {
    if (step !== 'review' || !productId) return
    setForecast(null)
    sellerAdsApi.forecast({ product_id: productId, daily_budget: Number(daily), max_cpc: maxCpc ? Number(maxCpc) : null, days: days || null })
      .then(setForecast).catch(() => setForecast(null))
  }, [step, productId, daily, maxCpc, days])

  const budgetError = useMemo(() => {
    if (!config) return null
    const d = Number(daily), c = Number(maxCpc)
    if (!(d >= config.min_daily_budget)) return t('wizard.budget.dailyHint', { min: money(config.min_daily_budget) })
    if (!(c >= config.min_cpc)) return t('wizard.budget.maxCpcHint', { suggested: money(config.suggested_cpc), min: money(config.min_cpc) })
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, daily, maxCpc])

  const idx = STEPS.indexOf(step)
  const canNext =
    (step === 'product' && !!productId && !busyIds.has(productId)) ||
    (step === 'readiness' && !!readiness?.passes) ||
    (step === 'budget' && !budgetError) ||
    step === 'audience' ||
    (step === 'placements' && (allPlacements || placements.length > 0))

  const next = () => {
    const to = STEPS[idx + 1]
    if (to === 'readiness' && productId) checkReadiness(productId)
    setStep(to)
  }

  const launch = async () => {
    setLoading(true); setError(null)
    try {
      // Opened from a Growth Radar card (?card=…): let the server measure the result
      const card = Number(search.get('card')) || undefined
      const c = await sellerAdsApi.create(card ? { ...payload, growth_card_id: card } : payload)
      router.push(`/seller/promote/campaigns/${c.id}?launched=1`)
    } catch (e: any) {
      const err = e as AdsApiError
      if (err.code === 'NOT_READY' && err.data?.readiness) { setReadiness(err.data.readiness); setStep('readiness') }
      setError(err.message ?? t('error'))
      setLoading(false)
    }
  }

  const walletShort = config && Number(daily) > config.wallet_available
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.input, color: p.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const chip = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${on ? RED : p.border}`, background: on ? RED : p.cardAlt, color: on ? '#fff' : p.text })
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 800, color: p.text, margin: '0 0 6px' }
  const hint: React.CSSProperties = { fontSize: 12, color: p.muted, margin: '6px 0 0', lineHeight: 1.45 }

  return (
    <PageFrame title={t('wizard.title')}>
      {/* Steps */}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 6, overflowX: 'auto' }} aria-label={t('wizard.title')}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={s === step ? 'step' : undefined} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800,
            background: s === step ? RED : i < idx ? `${GOLD}22` : p.cardAlt, color: s === step ? '#fff' : i < idx ? p.gold : p.muted, border: `1px solid ${p.border}`,
          }}>
            {i < idx ? <Check size={12} /> : <span>{i + 1}</span>}{t(`wizard.steps.${s}`)}
          </li>
        ))}
      </ol>

      {error && <Notice tone="error">{error}</Notice>}

      <Panel>
        {step === 'product' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('wizard.product.search')} style={inputStyle} />
            {products.length === 0 && <p style={{ color: p.muted, fontSize: 13 }}>{t('wizard.product.empty')}</p>}
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))' }}>
              {products.filter(x => x.name.toLowerCase().includes(query.trim().toLowerCase())).map(x => {
                const busy = busyIds.has(x.id), on = x.id === productId
                const img = x.primary_image_url ?? x.image_url
                return (
                  <button key={x.id} type="button" disabled={busy} onClick={() => setProductId(x.id)} style={{
                    display: 'flex', gap: 10, alignItems: 'center', textAlign: 'start', padding: 10, borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer',
                    background: on ? `${RED}12` : p.cardAlt, border: `1.5px solid ${on ? RED : p.border}`, color: p.text, opacity: busy ? 0.55 : 1, fontFamily: 'inherit',
                  }}>
                    <span style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: p.border, flexShrink: 0 }}>
                      {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
                      <span style={{ fontSize: 12, color: p.muted }}>{busy ? t('wizard.product.hasCampaign') : money(Number(x.price))}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 'readiness' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading || !readiness ? <BrandLoader variant="section" size="sm" theme={p.dark ? 'dark' : 'light'} /> : (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: p.text, marginBottom: 6 }}>
                    <span>{t('wizard.readiness.score')}</span><span>{readiness.score}/100</span>
                  </div>
                  <div role="progressbar" aria-valuenow={readiness.score} aria-valuemin={0} aria-valuemax={100} style={{ height: 10, borderRadius: 999, background: p.cardAlt, overflow: 'hidden' }}>
                    <div style={{ width: `${readiness.score}%`, height: '100%', background: readiness.passes ? '#16a34a' : '#d97706' }} />
                  </div>
                  <p style={hint}>{t('wizard.readiness.threshold', { threshold: readiness.threshold })}</p>
                </div>
                {readiness.passes
                  ? <Notice tone="success">{t('wizard.readiness.passes')}</Notice>
                  : <><p style={{ ...label, color: '#dc2626' }}>{t('wizard.readiness.blocked')}</p><TipList tips={readiness.blockers} productId={productId} tone="error" /></>}
                {readiness.tips.length > 0 && (<><p style={label}>{t('wizard.readiness.tipsTitle')}</p><TipList tips={readiness.tips} productId={productId} /></>)}
                <div><Button variant="ghost" small onClick={() => productId && checkReadiness(productId)}>{t('wizard.readiness.recheck')}</Button></div>
              </>
            )}
          </div>
        )}

        {step === 'budget' && config && (
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
            <div>
              <label style={label} htmlFor="ad-daily">{t('wizard.budget.daily')}</label>
              <input id="ad-daily" type="number" inputMode="decimal" min={config.min_daily_budget} step="0.5" value={daily} onChange={e => setDaily(e.target.value)} style={inputStyle} />
              <p style={hint}>{t('wizard.budget.dailyHint', { min: money(config.min_daily_budget) })}</p>
            </div>
            <div>
              <span style={label}>{t('wizard.budget.duration')}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => setDays(d)} style={chip(days === d)}>
                    {d === 0 ? t('wizard.budget.untilStopped') : t('wizard.budget.days', { count: d })}
                  </button>
                ))}
              </div>
              {days > 0 && <p style={hint}>{t('wizard.budget.endDate', { date: fmt.date(addDays(days), 'medium') })}</p>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              {config.tier_click_discount > 0 && <Notice tone="success">{t('wizard.budget.discount', { pct: Math.round(config.tier_click_discount * 100) })}</Notice>}
              <button type="button" onClick={() => setAdvanced(a => !a)} aria-expanded={advanced} style={{ marginTop: 10, background: 'none', border: 'none', color: p.gold, fontWeight: 800, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                {t('wizard.budget.advanced')} {advanced ? '▴' : '▾'}
              </button>
            </div>
            {advanced && (
              <>
                <div>
                  <label style={label} htmlFor="ad-cpc">{t('wizard.budget.maxCpc')}</label>
                  <input id="ad-cpc" type="number" inputMode="decimal" min={config.min_cpc} step="0.05" value={maxCpc} onChange={e => setMaxCpc(e.target.value)} style={inputStyle} />
                  <p style={hint}>{t('wizard.budget.maxCpcHint', { suggested: money(config.suggested_cpc), min: money(config.min_cpc) })}</p>
                </div>
                <div>
                  <label style={label} htmlFor="ad-total">{t('wizard.budget.totalBudget')}</label>
                  <input id="ad-total" type="number" inputMode="decimal" min={0} step="1" value={total} onChange={e => setTotal(e.target.value)} style={inputStyle} />
                  <p style={hint}>{t('wizard.budget.totalHint')}</p>
                </div>
              </>
            )}
            {budgetError && <div style={{ gridColumn: '1 / -1' }}><Notice tone="warn">{budgetError}</Notice></div>}
          </div>
        )}

        {step === 'audience' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setManual(false)} style={chip(!manual)}>{t('wizard.audience.auto')}</button>
              <button type="button" onClick={() => setManual(true)} style={chip(manual)}>{t('wizard.audience.manual')}</button>
            </div>
            {!manual ? <p style={hint}>{t('wizard.audience.autoHint')}</p> : (
              <>
                <Notice tone="warn">{t('wizard.audience.warning')}</Notice>
                <div>
                  <span style={label}>{t('wizard.audience.gender')}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['', 'female', 'male', 'unisex'].map(g => (
                      <button key={g || 'any'} type="button" onClick={() => setGender(g)} style={chip(gender === g)}>{t(`wizard.audience.genders.${g || 'any'}`)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={label}>{t('wizard.audience.wilayas')}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {WILAYAS.map(w => {
                      const on = wilayas.includes(w)
                      return <button key={w} type="button" onClick={() => setWilayas(v => on ? v.filter(x => x !== w) : [...v, w])} style={chip(on)}>{wl(w)}</button>
                    })}
                  </div>
                </div>
                {categories.length > 0 && (
                  <div>
                    <span style={label}>{t('wizard.audience.categories')}</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {categories.map(c => {
                        const on = cats.includes(c.id)
                        return <button key={c.id} type="button" onClick={() => setCats(v => on ? v.filter(x => x !== c.id) : [...v, c.id])} style={chip(on)}>{c.name}</button>
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <span style={label}>{t('wizard.audience.priceRange')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input aria-label={t('wizard.audience.priceMin')} placeholder={t('wizard.audience.priceMin')} type="number" inputMode="decimal" value={priceMin} onChange={e => setPriceMin(e.target.value)} style={inputStyle} />
                    <input aria-label={t('wizard.audience.priceMax')} placeholder={t('wizard.audience.priceMax')} type="number" inputMode="decimal" value={priceMax} onChange={e => setPriceMax(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'placements' && config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAllPlacements(true)} style={chip(allPlacements)}>{t('wizard.placements.all')}</button>
              <button type="button" onClick={() => { setAllPlacements(false); if (!placements.length) setPlacements(config.placements) }} style={chip(!allPlacements)}>{t('wizard.placements.some')}</button>
            </div>
            {!allPlacements && (
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
                {config.placements.map(pl => {
                  const on = placements.includes(pl)
                  return (
                    <label key={pl} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.cardAlt, color: p.text, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={on} onChange={() => setPlacements(v => on ? v.filter(x => x !== pl) : [...v, pl])} />
                      {t(`placementNames.${pl}`)}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {step === 'review' && config && product && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: p.text, margin: 0 }}>{product.name}</p>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', fontSize: 13, color: p.text }}>
              <div><span style={{ color: p.muted }}>{t('wizard.budget.daily')}</span><br /><b>{money(Number(daily))}</b></div>
              <div><span style={{ color: p.muted }}>{t('wizard.budget.maxCpc')}</span><br /><b>{money(Number(maxCpc))}</b></div>
              <div><span style={{ color: p.muted }}>{t('wizard.budget.duration')}</span><br /><b>{days ? t('wizard.budget.days', { count: days }) : t('wizard.budget.untilStopped')}</b></div>
              <div><span style={{ color: p.muted }}>{t('wizard.steps.audience')}</span><br /><b>{manual ? t('wizard.audience.manual') : t('wizard.audience.auto')}</b></div>
            </div>
            <div>
              <p style={label}>{t('wizard.review.forecast')}</p>
              {!forecast ? <BrandLoader variant="section" size="sm" theme={p.dark ? 'dark' : 'light'} /> : (
                <>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                    {(['impressions', 'clicks', 'orders'] as const).map(k => (
                      <div key={k} style={{ background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: 10, padding: 10 }}>
                        <p style={{ fontSize: 11, color: p.muted, margin: 0 }}>{t(`wizard.review.${k}`)}</p>
                        <p style={{ fontSize: 16, fontWeight: 900, color: p.text, margin: '2px 0 0' }}>{fmt.number(forecast.daily[k][0], { maximumFractionDigits: 1 })}–{fmt.number(forecast.daily[k][1], { maximumFractionDigits: 1 })}</p>
                      </div>
                    ))}
                    <div style={{ background: p.cardAlt, border: `1px solid ${p.border}`, borderRadius: 10, padding: 10 }}>
                      <p style={{ fontSize: 11, color: p.muted, margin: 0 }}>{t('wizard.review.spend')}</p>
                      <p style={{ fontSize: 16, fontWeight: 900, color: p.text, margin: '2px 0 0' }}>{money(forecast.daily.spend[0])}–{money(forecast.daily.spend[1])}</p>
                    </div>
                  </div>
                  <p style={hint}>{t('wizard.review.basedOn', {
                    source: t(forecast.assumptions.source === 'history' ? 'wizard.review.sourceHistory' : 'wizard.review.sourceTraffic'),
                    cpc: money(forecast.assumptions.expected_cpc),
                  })}</p>
                  {forecast.budget_limited && <Notice tone="info">{t('wizard.review.budgetLimited')}</Notice>}
                </>
              )}
            </div>
            <Notice tone="info">{t('wizard.review.noUpfront')}</Notice>
            {walletShort && (
              <Notice tone="warn">
                {t('wizard.review.needWallet', { amount: money(Number(daily)) })}{' '}
                <a href="/seller/promote/wallet" style={{ color: 'inherit', fontWeight: 800 }}>{t('wizard.review.topUpFirst')}</a>
              </Notice>
            )}
          </div>
        )}
      </Panel>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={() => (idx === 0 ? router.push('/seller/promote') : setStep(STEPS[idx - 1]))}>
          {idx === 0 ? t('wizard.cancel') : t('wizard.back')}
        </Button>
        {step === 'review'
          ? <Button onClick={launch} loading={loading} disabled={!!walletShort}>{t('wizard.review.launch')}</Button>
          : <Button onClick={next} disabled={!canNext || loading}>{t('wizard.next')}</Button>}
      </div>
    </PageFrame>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<RouteLoading area minHeight="60vh" />}>
      <Wizard />
    </Suspense>
  )
}
