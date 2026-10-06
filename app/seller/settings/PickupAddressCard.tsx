'use client'

/**
 * Seller pickup address — where the courier collects this seller's parcels.
 * Printed on every delivery slip; the admin can't export slips while it is
 * incomplete. Saves through PUT /api/seller/pickup-address (no re-review).
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Truck, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { storeProfileApi, type PickupAddressInput } from '@/lib/sellerApi'
import { WILAYAS, useWilayaLabel } from '@/lib/i18n/wilayas'
import { validateTunisianPhone } from '@/lib/shippingAddress'
import { ink } from '@/app/seller/ink'

import BrandLoader from '@/components/brand/BrandLoader'
const EMPTY: PickupAddressInput = {
  full_name: '', phone_number: '', pickup_address: '', city: '',
  pickup_postal_code: '', wilaya: '', pickup_notes: '',
}

/** Field → sellerPickup.errors key */
function validate(f: PickupAddressInput): Partial<Record<keyof PickupAddressInput, string>> {
  const e: Partial<Record<keyof PickupAddressInput, string>> = {}
  if (f.full_name.trim().length < 3)              e.full_name          = 'contact'
  if (!validateTunisianPhone(f.phone_number).valid) e.phone_number     = 'phone'
  if (f.pickup_address.trim().length < 5)         e.pickup_address     = 'street'
  if (f.city.trim().length < 2)                   e.city               = 'city'
  if (!/^\d{4}$/.test(f.pickup_postal_code.trim())) e.pickup_postal_code = 'postalCode'
  if (!f.wilaya)                                  e.wilaya             = 'wilaya'
  return e
}

export default function PickupAddressCard({ dark, cardBg, border, textMain, textMuted }: {
  dark: boolean; cardBg: string; border: string; textMain: string; textMuted: string
}) {
  const t           = useTranslations('sellerPickup')
  const wilayaLabel = useWilayaLabel()

  const [form,     setForm]     = useState<PickupAddressInput>(EMPTY)
  const [complete, setComplete] = useState(true)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [errors,   setErrors]   = useState<Partial<Record<keyof PickupAddressInput, string>>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    storeProfileApi.getPickup()
      .then(json => {
        const d = json.data ?? {}
        setForm({
          full_name: d.full_name ?? '', phone_number: d.phone_number ?? '', pickup_address: d.pickup_address ?? '',
          city: d.city ?? '', pickup_postal_code: d.pickup_postal_code ?? '', wilaya: d.wilaya ?? '',
          pickup_notes: d.pickup_notes ?? '',
        })
        setComplete(!!d.complete)
      })
      .catch(() => setApiError(t('loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const set = (k: keyof PickupAddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = k === 'pickup_postal_code' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }))
  }

  const save = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true); setApiError(null); setSaved(false)
    try {
      const json = await storeProfileApi.updatePickup({
        ...form,
        phone_number: validateTunisianPhone(form.phone_number).clean,
        pickup_notes: form.pickup_notes?.trim() || undefined,
      })
      setComplete(!!json.data?.complete)
      setSaved(true)
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors as Record<string, string[]> | undefined
      setApiError(fieldErrors ? Object.values(fieldErrors)[0][0] : (err?.message ?? t('loadFailed')))
    } finally {
      setSaving(false)
    }
  }

  const input = (err?: string): React.CSSProperties => ({
    width: '100%', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
    background: dark ? '#0D1117' : '#fff', color: textMain,
    border: `1.5px solid ${err ? '#ef4444' : border}`,
  })
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
  const Err = ({ k }: { k: keyof PickupAddressInput }) =>
    errors[k] ? <p role="alert" style={{ fontSize: 11, color: ink('#f87171', dark), margin: '4px 0 0', fontWeight: 600 }}>{t(`errors.${errors[k]}`)}</p> : null

  return (
    <div id="pickup" style={{ background: cardBg, border: `1px solid ${complete ? border : 'rgba(245,158,11,0.45)'}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Truck size={16} color="#db142e" />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('title')}</h2>
        {!loading && complete && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: ink('#4ade80', dark) }}>
            <CheckCircle2 size={12} /> {t('complete')}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>{t('subtitle')}</p>

      {!loading && !complete && (
        <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: ink('#b45309', dark), margin: 0 }}>{t('incomplete')}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><BrandLoader variant="inline" size={18} style={{ color: '#db142e' }} /></div>
      ) : (
        <div className="pickup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label} htmlFor="pk-contact">{t('contact')} *</label>
            <input id="pk-contact" dir="auto" value={form.full_name} onChange={set('full_name')} style={input(errors.full_name)} /><Err k="full_name" /></div>
          <div><label style={label} htmlFor="pk-phone">{t('phone')} *</label>
            <input id="pk-phone" type="tel" dir="ltr" inputMode="tel" placeholder="22 123 456" value={form.phone_number} onChange={set('phone_number')} style={input(errors.phone_number)} /><Err k="phone_number" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="pk-street">{t('street')} *</label>
            <input id="pk-street" dir="auto" placeholder={t('streetPlaceholder')} value={form.pickup_address} onChange={set('pickup_address')} style={input(errors.pickup_address)} maxLength={500} /><Err k="pickup_address" /></div>
          <div><label style={label} htmlFor="pk-city">{t('city')} *</label>
            <input id="pk-city" dir="auto" value={form.city} onChange={set('city')} style={input(errors.city)} /><Err k="city" /></div>
          <div><label style={label} htmlFor="pk-postal">{t('postalCode')} *</label>
            <input id="pk-postal" dir="ltr" inputMode="numeric" placeholder="1000" maxLength={4} value={form.pickup_postal_code} onChange={set('pickup_postal_code')} style={input(errors.pickup_postal_code)} /><Err k="pickup_postal_code" /></div>
          <div><label style={label} htmlFor="pk-wilaya">{t('wilaya')} *</label>
            <select id="pk-wilaya" value={form.wilaya} onChange={set('wilaya')} style={input(errors.wilaya)}>
              <option value="">—</option>
              {WILAYAS.map(w => <option key={w} value={w}>{wilayaLabel(w)}</option>)}
            </select><Err k="wilaya" /></div>
          <div><label style={label} htmlFor="pk-notes">{t('notes')}</label>
            <input id="pk-notes" dir="auto" placeholder={t('notesPlaceholder')} value={form.pickup_notes ?? ''} onChange={set('pickup_notes')} style={input()} maxLength={500} /></div>
        </div>
      )}

      {apiError && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '12px 0 0' }}>
          <AlertCircle size={13} /> {apiError}
        </p>
      )}
      {saved && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#4ade80', dark), margin: '12px 0 0' }}>
          <CheckCircle2 size={13} /> {t('saved')}
        </p>
      )}

      {!loading && (
        <button onClick={save} disabled={saving} style={{
          marginTop: 14, fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 999,
          background: '#db142e', border: 'none', color: '#fff', cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving && <BrandLoader variant="inline" size={13} />} {t('save')}
        </button>
      )}

      <style>{`@media (max-width: 560px) { .pickup-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
