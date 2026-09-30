'use client'

/**
 * Ad wallet: balance + free credit, top-up (gateway-driven — never a card form here),
 * pending top-ups and the ledger.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { sellerAdsApi, type TopUp, type Wallet, type WalletTx } from '@/lib/sellerAdsApi'
import { Button, Kpi, Notice, PageFrame, Panel, usePalette, GOLD } from '../_components/ui'

const RAW_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const API_URL = `${RAW_URL.replace(/\/api\/?$/, '')}/api`

export default function AdWalletPage() {
  const t   = useTranslations('seller.ads')
  const fmt = useFormat()
  const p   = usePalette()

  const [wallet, setWallet]   = useState<Wallet | null>(null)
  const [txs, setTxs]         = useState<WalletTx[]>([])
  const [page, setPage]       = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [topUps, setTopUps]   = useState<TopUp[]>([])
  const [d17, setD17]         = useState('')
  const [amount, setAmount]   = useState('')
  const [gateway, setGateway] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy]       = useState(false)
  const [notice, setNotice]   = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    const [w, tx, tu] = await Promise.all([sellerAdsApi.wallet(), sellerAdsApi.transactions(1), sellerAdsApi.topUps()])
    setWallet(w); setTxs(tx.data); setPage(1); setLastPage(tx.meta.last_page); setTopUps(tu)
    setGateway(g => g || w.gateways?.[0] || '')
    setAmount(a => a || String(w.min_top_up ?? ''))
  }, [])

  useEffect(() => {
    load().catch(e => setNotice({ tone: 'error', text: e?.message ?? t('error') }))
    fetch(`${API_URL}/checkout/payment-info`, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null)).then(j => setD17(j?.data?.d17_account_number ?? '')).catch(() => {})
  }, [load, t])

  const money = (v: number | null | undefined) => (v == null ? '—' : fmt.price(v))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setNotice(null)
    try {
      const res = await sellerAdsApi.topUp({ amount: Number(amount), gateway, ...(gateway === 'manual' ? { reference } : {}) })
      if (res.redirect_url) { window.location.href = res.redirect_url; return }
      setNotice(res.status === 'paid'
        ? { tone: 'success', text: t('walletPage.paid', { amount: money(res.top_up.amount) }) }
        : { tone: 'info', text: t('walletPage.pending') })
      setReference('')
      await load()
    } catch (err: any) {
      setNotice({ tone: 'error', text: err?.message ?? t('error') })
    } finally {
      setBusy(false)
    }
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
      subtitle={<Link href="/seller/promote" style={{ color: GOLD, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14} className="rtl-flip" />{t('detail.back')}</Link>}
    >
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
          {wallet && !wallet.gateways?.length ? <Notice tone="warn">{t('walletPage.noMethod')}</Notice> : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('walletPage.amount')}
                <input type="number" inputMode="decimal" min={wallet?.min_top_up} step="1" required value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
                <span style={{ fontSize: 11, color: p.muted, fontWeight: 500 }}>{t('walletPage.min', { min: money(wallet?.min_top_up) })}</span>
              </label>
              <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <legend style={{ fontSize: 12, fontWeight: 800, color: p.text, marginBottom: 6 }}>{t('walletPage.method')}</legend>
                {(wallet?.gateways ?? []).map(g => (
                  <label key={g} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: p.text, padding: '8px 10px', borderRadius: 10, border: `1px solid ${gateway === g ? GOLD : p.border}`, background: p.cardAlt, cursor: 'pointer' }}>
                    <input type="radio" name="gateway" value={g} checked={gateway === g} onChange={() => setGateway(g)} />
                    {t.has(`walletPage.methods.${g}`) ? t(`walletPage.methods.${g}`) : g}
                  </label>
                ))}
              </fieldset>
              {gateway === 'manual' && (
                <>
                  <p style={{ fontSize: 12, color: p.muted, margin: 0, lineHeight: 1.5 }}>{t('walletPage.manualHelp', { account: d17 || '—' })}</p>
                  <label style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{t('walletPage.reference')}
                    <input required maxLength={100} value={reference} onChange={e => setReference(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
                  </label>
                </>
              )}
              <Button type="submit" disabled={busy || !gateway}>{t('walletPage.pay')}</Button>
            </form>
          )}
        </Panel>
      </div>

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
                <span style={{ fontSize: 14, fontWeight: 900, color: x.amount < 0 ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap', direction: 'ltr' }}>
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
