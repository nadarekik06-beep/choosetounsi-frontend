'use client'

/** First/last name, phone, birth date, gender — profile Settings and /complete-profile. */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { validateTunisianPhone } from '@/lib/shippingAddress'
import { profileApi, syncSessionUser, ApiError, type Profile } from '@/lib/profileApi'
import { Field, PhoneInput } from './ui'

type Form = { first_name: string; last_name: string; phone: string; date_of_birth: string; gender: '' | 'male' | 'female' }
type Errors = Partial<Record<keyof Form, string>>

const NAME_RE = /^[\p{L}\p{M}' -]+$/u

/** Latest birth date allowed (13 years ago), as yyyy-mm-dd. */
function maxBirthDate() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 13)
  return d.toISOString().slice(0, 10)
}

export default function PersonalInfoForm({ profile, onSaved, showOptional = true, submitLabel, onCancel }: {
  profile: Profile
  onSaved: (p: Profile) => void
  showOptional?: boolean
  submitLabel?: string
  onCancel?: () => void
}) {
  const t  = useTranslations('profile.settings')
  const te = useTranslations('profile.errors')
  const tc = useTranslations('common')

  const [form, setForm] = useState<Form>({
    first_name:    profile.first_name ?? profile.suggested_first_name ?? '',
    last_name:     profile.last_name ?? profile.suggested_last_name ?? '',
    phone:         profile.phone ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    gender:        profile.gender ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): Errors => {
    const e: Errors = {}
    for (const k of ['first_name', 'last_name'] as const) {
      const v = form[k].trim()
      if (!v) e[k] = te('required')
      else if (v.length < 2) e[k] = te('nameShort')
      else if (!NAME_RE.test(v)) e[k] = te('nameLetters')
    }
    if (!form.phone.trim()) e.phone = te('required')
    else if (!validateTunisianPhone(form.phone).valid) e.phone = te('phoneInvalid')
    if (form.date_of_birth && form.date_of_birth > maxBirthDate()) e.date_of_birth = te('tooYoung')
    return e
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError('')
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const saved = await profileApi.update({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        phone:      validateTunisianPhone(form.phone).clean,
        ...(showOptional ? { date_of_birth: form.date_of_birth || null, gender: form.gender || null } : {}),
      })
      syncSessionUser(saved)
      onSaved(saved)
    } catch (err) {
      const api = err as ApiError
      if (api.fields && Object.keys(api.fields).length) setErrors(api.fields as Errors)
      else setFormError(api.message || tc('genericError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pf-form" onSubmit={submit} noValidate>
      <div className="pf-row cols-2">
        <Field label={t('firstName')} required error={errors.first_name} htmlFor="pf-first">
          <input id="pf-first" className="pf-input" autoComplete="given-name" dir="auto" maxLength={60}
            value={form.first_name} aria-invalid={!!errors.first_name} onChange={e => set('first_name', e.target.value)} />
        </Field>
        <Field label={t('lastName')} required error={errors.last_name} htmlFor="pf-last">
          <input id="pf-last" className="pf-input" autoComplete="family-name" dir="auto" maxLength={60}
            value={form.last_name} aria-invalid={!!errors.last_name} onChange={e => set('last_name', e.target.value)} />
        </Field>
      </div>

      <PhoneInput id="pf-phone" label={t('phone')} value={form.phone} error={errors.phone} onChange={v => set('phone', v)} />

      {showOptional && (
        <div className="pf-row cols-2">
          <Field label={t('dob')} error={errors.date_of_birth} htmlFor="pf-dob">
            <input id="pf-dob" type="date" className="pf-input" min="1900-01-01" max={maxBirthDate()}
              value={form.date_of_birth} aria-invalid={!!errors.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </Field>
          <div className="pf-field">
            <span className="pf-label" id="pf-gender-label">{t('gender')} <span style={{ textTransform: 'none', fontWeight: 500 }}>({tc('optional')})</span></span>
            <div className="pf-seg" role="group" aria-labelledby="pf-gender-label">
              {(['female', 'male', ''] as const).map(g => (
                <button key={g || 'none'} type="button" aria-pressed={form.gender === g} onClick={() => set('gender', g)}>
                  {g === 'female' ? t('genderFemale') : g === 'male' ? t('genderMale') : t('genderNone')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {formError && <div className="pf-alert error" role="alert">{formError}</div>}

      <div className="pf-actions">
        {onCancel && <button type="button" className="pf-btn light" onClick={onCancel}>{tc('cancel')}</button>}
        <button type="submit" className="pf-btn primary" disabled={saving}>
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? tc('saving') : (submitLabel ?? tc('save'))}
        </button>
      </div>
    </form>
  )
}
