'use client'

/**
 * Ad wallet: balance + free credit, top-up (never a card form here), payment
 * requests, pending top-ups and the ledger.
 *
 * Top-up methods: WhatsApp (manual payment request — the default while it is switched on;
 * it replaces the test and transfer-reference methods), plus any hosted gateway the
 * backend reports as available (Konnect / Flouci once integrated).
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { sellerAdsApi, type TopUp, type Wallet, type WalletTx } from '@/lib/sellerAdsApi'
import { createAndOpenWhatsApp, paymentRequestsApi, type ManualPaymentConfig, type PaymentRequest } from '@/lib/paymentRequestsApi'
import { ManualPaymentConfirmation, PaymentRequestHistory } from '@/app/components/seller/ManualPayment'
import { Button, Kpi, Notice, PageFrame, Panel, usePalette, GOLD } from '../_components/ui'
import { usePageLoading } from '@/components/brand/NavigationLoader'

const RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const API_URL = `${RAW_URL.replace(/\/api\/?$/, '')}/api`

/** Gateways the WhatsApp method replaces while it is switched on. */
const REPLACED_BY_WHATSAPP = ['sandbox', 'manual']

export default function AdWalletPage() {
  const t   = useTranslations('seller.ads')
  const tm  = useTranslations('manualPayment')
  const fmt = useFormat()
  const p   = usePalette()

  const [wallet, setWallet]   = useState<Wallet | null>(null)
  const [txs, setTxs]         = useState<WalletTx[]>([])
  const [page, setPage]       = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [topUps, setTopUps]   = useState<TopUp[]>([])
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [manual, setManual]   = useState<ManualPaymentConfig | null>(null)
  const [created, setCreated] = useState<PaymentRequest | null>(null)
  const [d17, setD17]         = useState('')
  const [amount, setAmount]   = useState('')
  const [gateway, setGateway] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy]       = useState(false)
  const [notice, setNotice]   = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)
  // holds the navigation loader until the first load is done
  usePageLoading(wallet === null && notice?.tone !== 'error')

  const methodsFor = (w: Wallet | null, cfg: ManualPaymentConfig | null) => {
    const gateways = w?.gateways ?? []
    return cfg?.enabled ? ['whatsapp', ...gateways.filter(g => !REPLACED_BY_WHATSAPP.includes(g))] : gateways
  }

  const loadRequests = useCallback(async () => {
    const res = await paymentRequestsApi.list('wallet_topup').catch(() => null)
    setRequests(res?.data ?? []); setManual(res?.config ?? null)
    return res?.config ?? null
  }, [])

  const load = useCallback(async () => {
    const [w, tx, tu, cfg] = await Promise.all([sellerAdsApi.wallet(), sellerAdsApi.transactions(1), sellerAdsApi.topUps(), loadRequests()])
    setWallet(w); setTxs(tx.data); setPage(1); setLastPage(tx.meta.last_page); setTopUps(tu)
    setGateway(g => g || methodsFor(w, cfg)[0] || '')
    setAmount(a => a || String((cfg?.enabled ? cfg.min_top_up : w.min_top_up) ?? ''))
  }, [loadRequests])

  useEffect(() => {
    load().catch(e => setNotice({ tone: 'error', text: e?.message ?? t('error') }))
    fetch(`${API_URL}/checkout/payment-info`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null)).then(j => setD17(j?.data?.d17_account_number ?? '')).catch(() => {})
  }, [load, t])

  const money = (v: number | null | undefined) => (v == null ? '—' : fmt.price(v))
  const methods = methodsFor(wallet, manual)
  const viaWhatsApp = gateway === 'whatsapp'
  const min = viaWhatsApp ? manual?.min_top_up : wallet?.min_top_up
  const max = viaWhatsApp ? manual?.max_top_up : undefined

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setNotice(null)
    // WhatsApp: the chat opens from this click (a new tab on computers, the app on phones).
    const run = viaWhatsApp ? submitWhatsApp() : submitGateway()
    run.catch((err: any) => setNotice({ tone: 'error', text: err?.message ?? t('error') })).finally(() => setBusy(false))
  }

  const submitWhatsApp = async () => {
    const req = await createAndOpenWhatsApp(() => paymentRequestsApi.topUp(Number(amount)))
    setCreated(req)
    await loadRequests()
  }

  const submitGateway = async () => {
    const res = await sellerAdsApi.topUp({ amount: Number(amount), gateway, ...(gateway === 'manual' ? { reference } : {}) })
    if (res.redirect_url) { window.location.href = res.redirect_url; return }
    setNotice(res.status === 'paid'
      ? { tone: 'success', text: t('walletPage.paid', { amount: money(res.top_up.amount) }) }
      : { tone: 'info', text: t('walletPage.pending') })
    setReference('')
    await load()
  }

  const more = async () => {
    const next = page + 1
    const res = await sellerAdsApi.transactions(next)
    setTxs(prev => [...prev, ...res.data]); setPage(next); setLastPage(res.meta.last_page)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.input, color: p.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const pending = topUps.filter(x => x.status === 'pending')

  return (
    <PageFrame
      title={t('walletPage.title')}
      subtitle={<Link href="/seller/promote" style={{ color: p.gold, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} className="rtl-flip" />{t('detail.back')}</Link>}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        <Panel title={t('wallet.title')}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <Kpi label={t('wallet.available')} value={money(wallet?.available)} />
            <Kpi label={t('wallet.balance')} value={money(wallet?.balance)} />
            <Kpi label={t('wallet.credit')} value={money(wallet?.credit_balance)}
              hint={wallet?.credit_expires_at ? t('wallet.creditExpires', { date: fmt.date(wallet.credit_expires_at, 'medium') }) : undefined} />
          </div>
        </Panel>

        <Panel title={t('walletPage.topUp')}>
          {created ? (
            <ManualPaymentConfirmation request={created} palette={p} onClose={() => setCreated(null)} />
          ) : wallet && !methods.length ? <Notice tone="warn">{manual && !manual.enabled ? tm('disabled') : t('walletPage.noMethod')}</Notice> : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('walletPage.amount')}
                <input type="number" inputMode="decimal" min={min} max={max} step="1" required value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
                <span style={{ fontSize: 11, color: p.muted, fontWeight: 500 }}>
                  {max != null ? tm('limits', { min: money(min), max: money(max) }) : t('walletPage.min', { min: money(min) })}
                </span>
              </label>
              {methods.length > 1 && (
                <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <legend style={{ fontSize: 12, fontWeight: 800, color: p.text, marginBottom: 6 }}>{t('walletPage.method')}</legend>
                  {methods.map(g => (
                    <label key={g} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: p.text, padding: '8px 10px', borderRadius: 10, border: `1px solid ${gateway === g ? GOLD : p.border}`, background: p.cardAlt, cursor: 'pointer' }}>
                      <input type="radio" name="gateway" value={g} checked={gateway === g} onChange={() => setGateway(g)} />
                      {t.has(`walletPage.methods.${g}`) ? t(`walletPage.methods.${g}`) : g}
                    </label>
                  ))}
                </fieldset>
              )}
              {viaWhatsApp && <p style={{ fontSize: 12, color: p.muted, margin: 0, lineHeight: 1.5 }}>{tm('howItWorks')}</p>}
              {gateway === 'manual' && (
                <>
                  <p style={{ fontSize: 12, color: p.muted, margin: 0, lineHeight: 1.5 }}>{t('walletPage.manualHelp', { account: d17 || '—' })}</p>
                  <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('walletPage.reference')}
                    <input required maxLength={100} value={reference} onChange={e => setReference(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
                  </label>
                </>
              )}
              <Button type="submit" loading={busy} disabled={!gateway}>{viaWhatsApp ? tm('submitTopUp') : t('walletPage.pay')}</Button>
            </form>
          )}
        </Panel>
      </div>

      {(requests.length > 0 || manual?.enabled) && (
        <Panel title={tm('historyTitle')}>
          <PaymentRequestHistory requests={requests} palette={p} onChanged={loadRequests} />
        </Panel>
      )}

      {pending.length > 0 && (
        <Panel title={t('walletPage.pendingTopUps')}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pending.map(x => (
              <li key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: p.text }}>
                <span>{fmt.date(x.created_at, 'medium')} · {x.reference ?? x.gateway}</span><b>{money(x.amount)}</b>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t('walletPage.history')}>
        {txs.length === 0 ? <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>{t('walletPage.empty')}</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {txs.map(x => (
              <li key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${p.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: p.text, margin: 0 }}>{t(`walletPage.types.${x.type}`)}</p>
                  <p style={{ fontSize: 11.5, color: p.muted, margin: '2px 0 0' }}>
                    {fmt.date(x.date ?? x.created_at, 'medium')}
                    {x.type === 'click_charge' && x.clicks != null && x.sponsorship_id && ` · ${t('walletPage.clicks', { count: x.clicks, id: x.sponsorship_id })}`}
                    {x.note && ` · ${x.note}`}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: x.amount < 0 ? '#dc2626' : p.positive, whiteSpace: 'nowrap', direction: 'ltr' }}>
                  {x.amount > 0 ? '+' : ''}{money(x.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {page < lastPage && <div style={{ marginTop: 10 }}><Button small variant="ghost" onClick={more}>{t('walletPage.more')}</Button></div>}
      </Panel>
    </PageFrame>
  )
}
