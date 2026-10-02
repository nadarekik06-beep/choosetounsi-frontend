'use client'

/**
 * Shipping address inputs shared by checkout and the address book.
 * Controlled: the parent owns `value` and `errors` (keys from
 * validateShippingAddress in lib/shippingAddress.ts).
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { User, MapPin, Hash, FileText } from 'lucide-react'
import { WILAYAS, useWilayaLabel } from '@/lib/i18n/wilayas'
import {
  validateTunisianPhone,
  type ShippingAddressForm, type ShippingAddressErrors,
} from '@/lib/shippingAddress'

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 6,
}

const inputStyle = (err?: string, extra?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`, borderRadius: 10,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
  background: err ? '#fef2f2' : '#fff', outline: 'none', ...extra,
})

export default function ShippingAddressFields({ value, errors, onChange }: {
  value: ShippingAddressForm
  errors: ShippingAddressErrors
  onChange: (field: keyof ShippingAddressForm, v: string) => void
}) {
  const t           = useTranslations('shippingAddress')
  const tp          = useTranslations('checkout.phone')
  const tc          = useTranslations('common')
  const wilayaLabel = useWilayaLabel()
  const [phoneTouched, setPhoneTouched] = useState(false)

  const err = (k: keyof ShippingAddressForm) => (errors[k] ? t(`errors.${errors[k]}`) : undefined)
  const Err = ({ k }: { k: keyof ShippingAddressForm }) =>
    errors[k] ? <p role="alert" style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>{err(k)}</p> : null
  const Req = () => <span style={{ color: '#ef4444' }}>*</span>
  const Opt = () => <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'none' }}>({tc('optional')})</span>

  const phoneInput = (k: 'phone' | 'phone_secondary', label: string, required: boolean) => {
    const check = validateTunisianPhone(value[k])
    const live  = k === 'phone' && phoneTouched && value[k].trim() !== ''
    const border = errors[k] ? '#ef4444' : live ? (check.valid ? '#10b981' : '#f59e0b') : '#e5e7eb'
    return (
      <div>
        <label style={labelStyle}>{label} {required ? <Req /> : <Opt />}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div dir="ltr" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f8fafc', fontSize: 13, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
            🇹🇳 +216
          </div>
          <input type="tel" dir="ltr" inputMode="tel" autoComplete={k === 'phone' ? 'tel-national' : 'off'}
            aria-label={label} aria-invalid={!!errors[k]} maxLength={15}
            value={value[k]} placeholder="20 123 456"
            onChange={e => onChange(k, e.target.value.replace(/[^0-9\s\-+.]/g, ''))}
            onBlur={() => k === 'phone' && setPhoneTouched(true)}
            style={inputStyle(err(k), { borderColor: border, flex: 1 })} />
        </div>
        {errors[k] ? <Err k={k} /> : live && check.hint ? (
          <p style={{ fontSize: 11, color: '#d97706', margin: '4px 0 0', fontWeight: 600 }}>{tp(check.hint, check.hintValues)}</p>
        ) : k === 'phone_secondary' ? (
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{t('secondPhoneHelp')}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Recipient */}
      <div>
        <label style={labelStyle}><User size={10} style={{ verticalAlign: '-1px' }} /> {t('recipientName')} <Req /></label>
        <input value={value.recipient_name} onChange={e => onChange('recipient_name', e.target.value)}
          autoComplete="name" aria-label={t('recipientName')} aria-invalid={!!errors.recipient_name}
          placeholder={t('recipientPlaceholder')} maxLength={120} dir="auto"
          style={inputStyle(err('recipient_name'))} />
        <Err k="recipient_name" />
      </div>

      {/* Phones */}
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {phoneInput('phone', t('phone'), true)}
        {phoneInput('phone_secondary', t('secondPhone'), false)}
      </div>

      {/* Governorate + delegation */}
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}><MapPin size={10} style={{ verticalAlign: '-1px' }} /> {t('wilaya')} <Req /></label>
          <select value={value.wilaya} onChange={e => onChange('wilaya', e.target.value)}
            aria-label={t('wilaya')} aria-invalid={!!errors.wilaya}
            style={inputStyle(err('wilaya'), { color: value.wilaya ? '#0f172a' : '#94a3b8' })}>
            <option value="">{t('selectWilaya')}</option>
            {WILAYAS.map(w => <option key={w} value={w}>{wilayaLabel(w)}</option>)}
          </select>
          <Err k="wilaya" />
        </div>
        <div>
          <label style={labelStyle}>{t('delegation')} <Req /></label>
          <input value={value.delegation} onChange={e => onChange('delegation', e.target.value)}
            autoComplete="address-level2" aria-label={t('delegation')} aria-invalid={!!errors.delegation}
            placeholder={t('delegationPlaceholder')} maxLength={100} dir="auto"
            style={inputStyle(err('delegation'))} />
          <Err k="delegation" />
        </div>
      </div>

      {/* Street + postal code */}
      <div className="sa-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 12 }}>
        <div>
          <label style={labelStyle}>{t('street')} <Req /></label>
          <input value={value.address} onChange={e => onChange('address', e.target.value)}
            autoComplete="street-address" aria-label={t('street')} aria-invalid={!!errors.address}
            placeholder={t('streetPlaceholder')} maxLength={500} dir="auto"
            style={inputStyle(err('address'))} />
          <Err k="address" />
        </div>
        <div>
          <label style={labelStyle}><Hash size={10} style={{ verticalAlign: '-1px' }} /> {t('postalCode')} <Opt /></label>
          <input value={value.postal_code} onChange={e => onChange('postal_code', e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="postal-code" inputMode="numeric" dir="ltr" aria-label={t('postalCode')} aria-invalid={!!errors.postal_code}
            placeholder="1000" maxLength={4}
            style={inputStyle(err('postal_code'))} />
          <Err k="postal_code" />
        </div>
      </div>

      {/* Landmark / notes */}
      <div>
        <label style={labelStyle}>{t('notes')} <Opt /></label>
        <div style={{ position: 'relative' }}>
          <FileText size={13} style={{ position: 'absolute', insetInlineStart: 12, top: 12, color: '#94a3b8', pointerEvents: 'none' }} />
          <textarea rows={2} value={value.notes} onChange={e => onChange('notes', e.target.value)}
            aria-label={t('notes')} placeholder={t('notesPlaceholder')} maxLength={500} dir="auto"
            style={inputStyle(undefined, { paddingInlineStart: 34, resize: 'none' })} />
        </div>
      </div>

      <style>{`@media (max-width: 560px) { .sa-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

