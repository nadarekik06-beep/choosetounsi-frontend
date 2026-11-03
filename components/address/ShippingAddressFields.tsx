'use client'

/**
 * Shipping address inputs shared by checkout and the address book.
 * Controlled: the parent owns `value` and `errors` (keys from
 * validateShippingAddress in lib/shippingAddress.ts).
 *
 * `compact` (checkout): only the fields the courier needs — no second phone,
 * no postal code, no example placeholders, plain labels, "Comment" for the
 * delivery notes. The address book keeps the full form. Hidden fields keep
 * whatever value the form already has (a saved address), they are just not shown.
 */

import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { User, MapPin, Hash, FileText } from 'lucide-react'
import { WILAYAS, useWilayaLabel } from '@/lib/i18n/wilayas'
import { useRegions, useDistricts, regionLabel } from '@/lib/regions'
import {
  validateTunisianPhone,
  type ShippingAddressForm, type ShippingAddressErrors,
} from '@/lib/shippingAddress'

const fullLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6,
}
const compactLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 5,
}

const inputStyle = (err?: string, extra?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
  background: err ? '#fef2f2' : '#fff', outline: 'none', ...extra,
})

export default function ShippingAddressFields({ value, errors, onChange, compact = false }: {
  value: ShippingAddressForm
  errors: ShippingAddressErrors
  onChange: (field: keyof ShippingAddressForm, v: string) => void
  compact?: boolean
}) {
  const t           = useTranslations('shippingAddress')
  const tp          = useTranslations('checkout.phone')
  const tc          = useTranslations('common')
  const wilayaLabel = useWilayaLabel()
  const locale      = useLocale()
  const uid         = useId()
  const id          = (k: string) => `${uid}-${k}`
  const [phoneTouched, setPhoneTouched] = useState(false)
  // The courier's governorates / delegations (free text until the backend has synced them)
  const regions     = useRegions()
  const cityId      = value.intigo_city_id ? Number(value.intigo_city_id) : null
  const { districts, loading: districtsLoading } = useDistricts(regions.available ? cityId : null)

  const labelStyle = compact ? compactLabelStyle : fullLabelStyle
  // Example placeholders only on the full form (checkout labels say it all)
  const ph = (text: string) => (compact ? undefined : text)
  const icon = (I: React.ElementType) => (compact ? null : <><I size={10} style={{ verticalAlign: '-1px' }} />{' '}</>)

  const pickCity = (cid: string) => {
    const city = regions.cities.find(c => String(c.id) === cid)
    onChange('intigo_city_id', cid)
    onChange('wilaya', city?.wilaya ?? city?.name ?? '')
    onChange('intigo_district_id', '')
    onChange('delegation', '')
  }
  const pickDistrict = (did: string) => {
    const d = districts.find(x => String(x.id) === did)
    onChange('intigo_district_id', did)
    onChange('delegation', d?.name ?? '')
  }

  const err = (k: keyof ShippingAddressForm) => (errors[k] ? t(`errors.${errors[k]}`) : undefined)
  const errEl = (k: keyof ShippingAddressForm) =>
    errors[k] ? <p role="alert" style={{ fontSize: compact ? 12 : 11, color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>{err(k)}</p> : null
  const req = <span style={{ color: '#ef4444' }}>*</span>
  const opt = <span style={{ fontSize: compact ? 12 : 10, fontWeight: 500, textTransform: 'none', color: '#94a3b8' }}>({tc('optional')})</span>

  const phoneInput = (k: 'phone' | 'phone_secondary', label: string, required: boolean) => {
    const check = validateTunisianPhone(value[k])
    const live  = k === 'phone' && phoneTouched && value[k].trim() !== ''
    // Checkout: checked when the field is left, with a short message in red
    const blurError = compact && live && !check.valid
      ? (check.hint && check.hint !== 'hintDigits' ? tp(check.hint, check.hintValues) : t('errors.phoneInvalid'))
      : null
    const border = errors[k] || blurError ? '#ef4444' : live ? (check.valid ? '#10b981' : '#f59e0b') : '#e5e7eb'
    return (
      <div>
        <label htmlFor={id(k)} style={labelStyle}>{label} {required ? req : opt}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div dir="ltr" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8fafc', fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
            🇹🇳 +216
          </div>
          <input id={id(k)} name={k === 'phone' ? 'tel' : undefined} type="tel" dir="ltr"
            inputMode={compact ? 'numeric' : 'tel'} autoComplete={k === 'phone' ? 'tel-national' : 'off'}
            aria-invalid={!!errors[k] || !!blurError} maxLength={15}
            value={value[k]} placeholder={ph('20 123 456')}
            onChange={e => onChange(k, e.target.value.replace(/[^0-9\s\-+.]/g, ''))}
            onBlur={() => k === 'phone' && setPhoneTouched(true)}
            style={inputStyle(err(k) ?? blurError ?? undefined, { borderColor: border, flex: 1 })} />
        </div>
        {errors[k] ? errEl(k) : blurError ? (
          <p role="alert" style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>{blurError}</p>
        ) : !compact && live && check.hint ? (
          <p style={{ fontSize: 11, color: '#d97706', margin: '4px 0 0', fontWeight: 600 }}>{tp(check.hint, check.hintValues)}</p>
        ) : k === 'phone_secondary' ? (
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{t('secondPhoneHelp')}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 16 }}>
      {/* Recipient */}
      <div>
        <label htmlFor={id('recipient_name')} style={labelStyle}>{icon(User)}{t('recipientName')} {req}</label>
        <input id={id('recipient_name')} name="name" value={value.recipient_name} onChange={e => onChange('recipient_name', e.target.value)}
          autoComplete="name" aria-invalid={!!errors.recipient_name}
          placeholder={ph(t('recipientPlaceholder'))} maxLength={120} dir="auto"
          style={inputStyle(err('recipient_name'))} />
        {errEl('recipient_name')}
      </div>

      {/* Phones (checkout: the main phone only) */}
      {compact ? phoneInput('phone', t('phone'), true) : (
        <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {phoneInput('phone', t('phone'), true)}
          {phoneInput('phone_secondary', t('secondPhone'), false)}
        </div>
      )}

      {/* Governorate + delegation: the courier's lists once synced, else free text */}
      {regions.available ? (
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor={id('wilaya')} style={labelStyle}>{icon(MapPin)}{t('wilaya')} {req}</label>
          <select id={id('wilaya')} value={value.intigo_city_id} onChange={e => pickCity(e.target.value)}
            autoComplete="address-level1" aria-invalid={!!errors.wilaya}
            style={inputStyle(err('wilaya'), { color: value.intigo_city_id ? '#0f172a' : '#94a3b8' })}>
            <option value="">{t('selectWilaya')}</option>
            {[...regions.cities]
              .sort((a, b) => regionLabel(a, locale).localeCompare(regionLabel(b, locale), locale))
              .map(c => <option key={c.id} value={String(c.id)}>{regionLabel(c, locale)}</option>)}
          </select>
          {errEl('wilaya')}
        </div>
        <div>
          <label htmlFor={id('delegation')} style={labelStyle}>{t('delegation')} {req}</label>
          <select id={id('delegation')} value={value.intigo_district_id} onChange={e => pickDistrict(e.target.value)}
            disabled={!cityId || districtsLoading}
            autoComplete="address-level2" aria-invalid={!!errors.delegation}
            style={inputStyle(err('delegation'), { color: value.intigo_district_id ? '#0f172a' : '#94a3b8', opacity: cityId ? 1 : 0.6 })}>
            <option value="">{!cityId ? t('selectWilayaFirst') : districtsLoading ? t('loadingDelegations') : t('selectDelegation')}</option>
            {[...districts]
              .sort((a, b) => regionLabel(a, locale).localeCompare(regionLabel(b, locale), locale))
              .map(d => <option key={d.id} value={String(d.id)}>{regionLabel(d, locale)}</option>)}
          </select>
          {errEl('delegation')}
        </div>
      </div>
      ) : (
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor={id('wilaya')} style={labelStyle}>{icon(MapPin)}{t('wilaya')} {req}</label>
          <select id={id('wilaya')} value={value.wilaya} onChange={e => onChange('wilaya', e.target.value)}
            autoComplete="address-level1" aria-invalid={!!errors.wilaya}
            style={inputStyle(err('wilaya'), { color: value.wilaya ? '#0f172a' : '#94a3b8' })}>
            <option value="">{t('selectWilaya')}</option>
            {WILAYAS.map(w => <option key={w} value={w}>{wilayaLabel(w)}</option>)}
          </select>
          {errEl('wilaya')}
        </div>
        <div>
          <label htmlFor={id('delegation')} style={labelStyle}>{t('delegation')} {req}</label>
          <input id={id('delegation')} value={value.delegation} onChange={e => onChange('delegation', e.target.value)}
            autoComplete="address-level2" aria-invalid={!!errors.delegation}
            placeholder={ph(t('delegationPlaceholder'))} maxLength={100} dir="auto"
            style={inputStyle(err('delegation'))} />
          {errEl('delegation')}
        </div>
      </div>
      )}

      {/* Street (+ postal code on the full form) */}
      {compact ? (
        <div>
          <label htmlFor={id('address')} style={labelStyle}>{t('street')} {req}</label>
          <input id={id('address')} name="street-address" value={value.address} onChange={e => onChange('address', e.target.value)}
            autoComplete="street-address" aria-invalid={!!errors.address}
            maxLength={500} dir="auto"
            style={inputStyle(err('address'))} />
          {errEl('address')}
        </div>
      ) : (
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 12 }}>
        <div>
          <label htmlFor={id('address')} style={labelStyle}>{t('street')} {req}</label>
          <input id={id('address')} value={value.address} onChange={e => onChange('address', e.target.value)}
            autoComplete="street-address" aria-invalid={!!errors.address}
            placeholder={t('streetPlaceholder')} maxLength={500} dir="auto"
            style={inputStyle(err('address'))} />
          {errEl('address')}
        </div>
        <div>
          <label htmlFor={id('postal_code')} style={labelStyle}>{icon(Hash)}{t('postalCode')} {opt}</label>
          <input id={id('postal_code')} value={value.postal_code} onChange={e => onChange('postal_code', e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="postal-code" inputMode="numeric" dir="ltr" aria-invalid={!!errors.postal_code}
            placeholder="1000" maxLength={4}
            style={inputStyle(err('postal_code'))} />
          {errEl('postal_code')}
        </div>
      </div>
      )}

      {/* Delivery notes: "Comment" at checkout, sent as `notes` either way */}
      <div>
        <label htmlFor={id('notes')} style={labelStyle}>{compact ? t('comment') : t('notes')} {opt}</label>
        {compact ? (
          <textarea id={id('notes')} rows={2} value={value.notes} onChange={e => onChange('notes', e.target.value)}
            maxLength={500} dir="auto"
            style={inputStyle(undefined, { resize: 'none' })} />
        ) : (
          <div style={{ position: 'relative' }}>
            <FileText size={13} style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
            <textarea id={id('notes')} rows={2} value={value.notes} onChange={e => onChange('notes', e.target.value)}
              placeholder={t('notesPlaceholder')} maxLength={500} dir="auto"
              style={inputStyle(undefined, { paddingInlineStart: 34, resize: 'none' })} />
          </div>
        )}
      </div>

      <style>{`@media (max-width: 560px) { .sa-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
