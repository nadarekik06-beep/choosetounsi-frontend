'use client'

/**
 * Shop stock alerts: low-stock alerts on/off, threshold (pieces) and channel.
 * Saves through PUT /api/seller/stock-alerts. A product can override the
 * threshold in its own form; out-of-stock alerts are always sent.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react'
import { storeProfileApi, type StockAlertChannel, type StockAlertSettings } from '@/lib/sellerApi'
import { ink } from '@/app/seller/ink'

import BrandLoader from '@/components/brand/BrandLoader'

export default function StockAlertsCard({ dark, cardBg, border, textMain, textMuted }: {
  dark: boolean; cardBg: string; border: string; textMain: string; textMuted: string
}) {
  const t = useTranslations('seller.settings.stockAlerts')

  const [settings,  setSettings]  = useState<StockAlertSettings | null>(null)
  const [enabled,   setEnabled]   = useState(true)
  const [threshold, setThreshold] = useState('2')
  const [channel,   setChannel]   = useState<StockAlertChannel>('in_app')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    storeProfileApi.getStockAlerts()
      .then(json => {
        const d = json.data
        setSettings(d)
        setEnabled(d.enabled)
        setThreshold(String(d.threshold))
        setChannel(d.channel)
      })
      .catch(() => setError(t('loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const n        = parseInt(threshold, 10)
  const badValue = !Number.isInteger(n) || n < 1 || n > 50

  const save = async () => {
    if (enabled && badValue) return
    setSaving(true); setError(null); setSaved(false)
    try {
      // Alerts off: an unfinished threshold keeps the stored one
      const json = await storeProfileApi.updateStockAlerts({ enabled, threshold: badValue ? (settings?.threshold ?? 2) : n, channel })
      setSettings(json.data)
      setSaved(true)
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors as Record<string, string[]> | undefined
      setError(fieldErrors ? Object.values(fieldErrors)[0][0] : (err?.response?.data?.message ?? t('saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const dirty = () => setSaved(false)

  const input: React.CSSProperties = {
    width: '100%', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
    background: dark ? '#0D1117' : '#fff', color: textMain, border: `1.5px solid ${border}`,
  }
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const option = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, cursor: enabled ? 'pointer' : 'default',
    fontSize: 13, fontWeight: 700, color: textMain, flex: '1 1 200px',
    border: `1.5px solid ${active ? '#db142e' : border}`,
    background: active ? (dark ? 'rgba(219,20,46,0.12)' : 'rgba(219,20,46,0.05)') : 'transparent',
  })

  return (
    <div id="stock-alerts" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Bell size={16} color="#db142e" />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('title')}</h2>
      </div>
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>{t('hint')}</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><BrandLoader variant="inline" size={18} style={{ color: '#db142e' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* On / off */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>{t('enabled')}</span>
            <button
              type="button" role="switch" aria-checked={enabled} aria-label={t('enabled')}
              onClick={() => { setEnabled(v => !v); dirty() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 12, fontWeight: 800, color: enabled ? ink('#4ade80', dark) : textMuted, padding: 0,
              }}
            >
              <span style={{
                position: 'relative', width: 38, height: 22, borderRadius: 999, flexShrink: 0, transition: 'background .2s',
                background: enabled ? '#198f41' : (dark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'),
              }}>
                <span style={{
                  position: 'absolute', top: 3, insetInlineStart: enabled ? 19 : 3, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff', transition: 'inset-inline-start .2s',
                }} />
              </span>
              {enabled ? t('enabledOn') : t('enabledOff')}
            </button>
          </div>

          <div style={{ opacity: enabled ? 1 : 0.5, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ maxWidth: 220 }}>
              <label style={label} htmlFor="sa-threshold">{t('threshold')}</label>
              <input
                id="sa-threshold" type="number" min={1} max={50} inputMode="numeric" dir="ltr" disabled={!enabled}
                value={threshold}
                onChange={e => { setThreshold(e.target.value.replace(/\D/g, '').slice(0, 2)); dirty() }}
                style={{ ...input, border: `1.5px solid ${enabled && badValue ? '#ef4444' : border}` }}
              />
              {enabled && badValue && <p role="alert" style={{ fontSize: 11, color: ink('#f87171', dark), margin: '4px 0 0', fontWeight: 600 }}>{t('thresholdError')}</p>}
            </div>
            <p style={{ fontSize: 12, color: textMuted, margin: '-6px 0 0' }}>{t('thresholdHint', { n: badValue ? 2 : n })}</p>

            <div>
              <span style={label}>{t('channel')}</span>
              <div role="radiogroup" aria-label={t('channel')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['in_app', 'in_app_email'] as StockAlertChannel[]).map(c => (
                  <label key={c} style={option(channel === c)}>
                    <input
                      type="radio" name="sa-channel" value={c} disabled={!enabled}
                      checked={channel === c}
                      onChange={() => { setChannel(c); dirty() }}
                      style={{ accentColor: '#db142e' }}
                    />
                    {c === 'in_app' ? t('channelInApp') : t('channelEmail')}
                  </label>
                ))}
              </div>
              {channel === 'in_app_email' && settings && !settings.has_email && (
                <p style={{ fontSize: 12, fontWeight: 700, color: ink('#f59e0b', dark), margin: '8px 0 0' }}>{t('noEmail')}</p>
              )}
            </div>
          </div>

          {settings && settings.group_window > 0 && (
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{t('grouping', { n: settings.group_window })}</p>
          )}
        </div>
      )}

      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '12px 0 0' }}>
          <AlertCircle size={13} /> {error}
        </p>
      )}
      {saved && (
        <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#4ade80', dark), margin: '12px 0 0' }}>
          <CheckCircle2 size={13} /> {t('saved')}
        </p>
      )}

      {!loading && (
        <button onClick={save} disabled={saving || (enabled && badValue)} style={{
          marginTop: 14, fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 999,
          background: '#db142e', border: 'none', color: '#fff', cursor: saving ? 'default' : 'pointer',
          opacity: saving || (enabled && badValue) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving && <BrandLoader variant="inline" size={13} />} {t('save')}
        </button>
      )}
    </div>
  )
}
