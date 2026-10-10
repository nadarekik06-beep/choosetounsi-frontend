'use client'

/**
 * "WhatsApp notifications": the number CHOOSE'Tounsi messages when an order is
 * confirmed (prepare it, then mark it prepared), and the language of those
 * messages. Saves through PUT /api/seller/whatsapp; the server stores it as
 * 216XXXXXXXX.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { storeProfileApi, type WhatsAppLanguage, type WhatsAppSettings } from '@/lib/sellerApi'
import { ink } from '@/app/seller/ink'

import BrandLoader from '@/components/brand/BrandLoader'

/** Same rule as the backend (TunisianPhone): 8 digits after 216, mobile prefixes 2 / 4 / 5 / 9. */
export function normalizeTunisianMobile(value: string): string | null {
  let digits = value.replace(/\D/g, '')
  digits = digits.replace(/^(00)?216(?=\d{8}$)/, '')
  return /^[2459]\d{7}$/.test(digits) ? digits : null
}

export default function WhatsAppCard({ dark, cardBg, border, textMain, textMuted }: {
  dark: boolean; cardBg: string; border: string; textMain: string; textMuted: string
}) {
  const t = useTranslations('seller.settings.whatsapp')

  const [settings, setSettings] = useState<WhatsAppSettings | null>(null)
  const [number,   setNumber]   = useState('')
  const [language, setLanguage] = useState<WhatsAppLanguage>('fr')
  const [touched,  setTouched]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    storeProfileApi.getWhatsApp()
      .then(json => {
        setSettings(json.data)
        setNumber(json.data.whatsapp_number ? json.data.whatsapp_number.slice(3) : '')
        setLanguage(json.data.language)
      })
      .catch(() => setError(t('loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const normalized = normalizeTunisianMobile(number)
  const invalid    = touched && normalized === null

  const save = async () => {
    setTouched(true)
    if (!normalized) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const json = await storeProfileApi.updateWhatsApp({ whatsapp_number: normalized, language })
      setSettings(json.data)
      setNumber(normalized)
      setSaved(true)
      window.dispatchEvent(new Event('seller-whatsapp:changed'))   // hides the dashboard banner
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors as Record<string, string[]> | undefined
      setError(fieldErrors?.whatsapp_number ? t('invalid') : (err?.response?.data?.message ?? t('saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const input: React.CSSProperties = {
    flex: 1, minWidth: 0, borderRadius: 10, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
    background: dark ? '#0D1117' : '#fff', color: textMain, border: `1.5px solid ${invalid ? '#ef4444' : border}`, letterSpacing: '0.03em',
  }
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const option = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, color: textMain, flex: '1 1 160px',
    border: `1.5px solid ${active ? '#198f41' : border}`,
    background: active ? (dark ? 'rgba(25,143,65,0.14)' : 'rgba(25,143,65,0.06)') : 'transparent',
  })

  return (
    <div id="whatsapp" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <MessageCircle size={16} color="#198f41" />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('title')}</h2>
      </div>
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>
        {t('hint', { number: settings?.business_number ?? '+216 57 252 576' })}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><BrandLoader variant="inline" size={18} style={{ color: '#198f41' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ maxWidth: 360 }}>
            <label style={label} htmlFor="wa-number">{t('number')}</label>
            <div dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: textMuted }}>+216</span>
              <input
                id="wa-number" type="tel" inputMode="tel" autoComplete="tel" placeholder="22 345 678"
                value={number}
                onChange={e => { setNumber(e.target.value.slice(0, 20)); setSaved(false) }}
                onBlur={() => number && setTouched(true)}
                aria-invalid={invalid || undefined}
                style={input}
              />
            </div>
            {invalid
              ? <p role="alert" style={{ fontSize: 11, color: ink('#f87171', dark), margin: '4px 0 0', fontWeight: 600 }}>{t('invalid')}</p>
              : <p style={{ fontSize: 11, color: textMuted, margin: '4px 0 0' }}>{t('numberHint')}</p>}
          </div>

          <div>
            <span style={label}>{t('language')}</span>
            <div role="radiogroup" aria-label={t('language')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 420 }}>
              {(['fr', 'ar'] as WhatsAppLanguage[]).map(l => (
                <label key={l} style={option(language === l)}>
                  <input type="radio" name="wa-language" value={l} checked={language === l}
                    onChange={() => { setLanguage(l); setSaved(false) }} style={{ accentColor: '#198f41' }} />
                  {l === 'fr' ? 'Français' : 'العربية'}
                </label>
              ))}
            </div>
          </div>

          {!settings?.whatsapp_number && settings?.fallback_phone && (
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{t('fallback', { phone: settings.fallback_phone })}</p>
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
        <button onClick={save} disabled={saving} style={{
          marginTop: 14, fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 999,
          background: '#198f41', border: 'none', color: '#fff', cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving && <BrandLoader variant="inline" size={13} />} {t('save')}
        </button>
      )}
    </div>
  )
}
