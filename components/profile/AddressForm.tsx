'use client'

/**
 * Add / edit one saved delivery address. Same fields and rules as checkout
 * (ShippingAddressFields + lib/shippingAddress), so a saved address always
 * passes checkout.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ShippingAddressFields from '@/components/address/ShippingAddressFields'
import {
  emptyShippingAddress, shippingAddressFrom, validateShippingAddress, shippingAddressPayload,
  type ShippingAddressForm, type ShippingAddressErrors,
} from '@/lib/shippingAddress'
import { addressApi, ApiError, type SavedAddress } from '@/lib/profileApi'
import { Switch } from './ui'

import BrandLoader from '@/components/brand/BrandLoader'
// Stored values stay in English; only their label is translated (same as the address book).
const LABELS = ['Home', 'Work', 'Parents', 'Other'] as const

export default function AddressForm({ initial, prefill, forceDefault, onSaved, onCancel, submitLabel, cancelLabel }: {
  initial?: SavedAddress
  prefill?: Partial<ShippingAddressForm>
  /** First address: always the default, no toggle. */
  forceDefault?: boolean
  onSaved: (a: SavedAddress) => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
}) {
  const t  = useTranslations('profile.addresses')
  const tl = useTranslations('addresses.labels')
  const tc = useTranslations('common')

  const [form, setForm] = useState<ShippingAddressForm>(() =>
    initial ? shippingAddressFrom(initial) : { ...emptyShippingAddress(), ...prefill })
  const [label, setLabel] = useState(initial?.label ?? 'Home')
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? !!forceDefault)
  const [errors, setErrors] = useState<ShippingAddressErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const onChange = (field: keyof ShippingAddressForm, v: string) => {
    setForm(f => ({ ...f, [field]: v }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError('')
    const e = validateShippingAddress(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const body = { ...shippingAddressPayload(form), label }
      let saved = initial
        ? await addressApi.update(initial.id, body)
        : await addressApi.create({ ...body, is_default: isDefault })
      if (initial && isDefault && !initial.is_default) saved = await addressApi.setDefault(initial.id)
      onSaved(saved)
    } catch (err) {
      const api = err as ApiError
      setFormError(Object.values(api.fields ?? {})[0] || api.message || tc('genericError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pf-form" onSubmit={submit} noValidate>
      <div className="pf-field">
        <span className="pf-label" id="pf-addr-label">{t('labelField')}</span>
        <div className="pf-seg" role="group" aria-labelledby="pf-addr-label">
          {LABELS.map(l => (
            <button key={l} type="button" aria-pressed={label === l} onClick={() => setLabel(l)}>{tl(l.toLowerCase())}</button>
          ))}
        </div>
      </div>

      <ShippingAddressFields value={form} errors={errors} onChange={onChange} />

      {!forceDefault && !(initial?.is_default) && (
        <div className="pf-switch-row">
          <div className="grow"><strong>{t('useAsDefault')}</strong><span>{t('useAsDefaultHint')}</span></div>
          <Switch checked={isDefault} onChange={setIsDefault} label={t('useAsDefault')} />
        </div>
      )}

      {formError && <div className="pf-alert error" role="alert">{formError}</div>}

      <div className="pf-actions">
        {onCancel && <button type="button" className="pf-btn light" onClick={onCancel}>{cancelLabel ?? tc('cancel')}</button>}
        <button type="submit" className="pf-btn primary" disabled={saving}>
          {saving && <BrandLoader variant="inline" size={15} />}
          {saving ? tc('saving') : (submitLabel ?? t('save'))}
        </button>
      </div>
    </form>
  )
}
