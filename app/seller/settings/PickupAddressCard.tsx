'use client'

/**
 * Seller pickup address ("Adresse d'enlèvement"): where the Intigo courier
 * collects this seller's parcels, in the fields of Intigo's own form (address,
 * zone, map pin) — see components/pickup/PickupAddressFields.
 *
 * Saves through PUT /api/seller/pickup-address (no re-review of the shop). Any
 * change must be validated by the admin, who updates Intigo: until then new
 * parcels wait, and the seller sees why.
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Truck, CheckCircle2, AlertCircle, AlertTriangle, Clock } from 'lucide-react'
import { storeProfileApi } from '@/lib/sellerApi'
import PickupAddressFields from '@/components/pickup/PickupAddressFields'
import {
  emptyPickupAddress, pickupErrorsFromApi, pickupFromApi, pickupPayload, validatePickupAddress,
  type PickupAddressValue, type PickupErrors, type PickupStatus,
} from '@/lib/pickupAddress'
import { ink } from '@/app/seller/ink'

import BrandLoader from '@/components/brand/BrandLoader'

export default function PickupAddressCard({ dark, cardBg, border, textMain, textMuted }: {
  dark: boolean; cardBg: string; border: string; textMain: string; textMuted: string
}) {
  const t = useTranslations('pickupAddress')

  const [form,     setForm]     = useState<PickupAddressValue>(emptyPickupAddress)
  const [status,   setStatus]   = useState<PickupStatus | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [notice,   setNotice]   = useState<string | null>(null)
  const [errors,   setErrors]   = useState<PickupErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    storeProfileApi.getPickup()
      .then(json => { setForm(pickupFromApi(json.data)); setStatus(json.data?.status ?? null) })
      .catch(() => setApiError(t('loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const change = (v: PickupAddressValue) => {
    setForm(v)
    setNotice(null)
    // Clear the errors of the fields being fixed
    setErrors(prev => {
      const next = { ...prev }
      const now = validatePickupAddress(v)
      for (const k of Object.keys(next) as (keyof PickupErrors)[]) if (!now[k]) delete next[k]
      return next
    })
  }

  const save = async () => {
    const e = validatePickupAddress(form)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true); setApiError(null); setNotice(null)
    try {
      const json = await storeProfileApi.updatePickup(pickupPayload(form))
      setForm(pickupFromApi(json.data))
      setStatus(json.data?.status ?? null)
      setNotice(json.changed ? t('saved') : t('unchanged'))
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { errors?: Record<string, string[]> } } }
      const mapped = pickupErrorsFromApi(e?.response?.data?.errors)
      setErrors(mapped)
      setApiError(Object.keys(mapped).length ? null : (e?.message ?? t('loadFailed')))
    } finally {
      setSaving(false)
    }
  }

  const pending  = status === 'changed' || status === 'unverified' || status === 'verified'
  const missing  = status === 'needs_review'
  const accent   = missing || pending ? 'rgba(245,158,11,0.45)' : border

  const Banner = ({ icon, color, title, body }: { icon: React.ReactNode; color: string; title?: string; body: string }) => (
    <div role="status" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <p style={{ fontSize: 12, fontWeight: 600, color: ink(color, dark), margin: 0, lineHeight: 1.5 }}>
        {title && <b style={{ display: 'block', fontWeight: 800 }}>{title}</b>}
        {body}
      </p>
    </div>
  )

  return (
    <div id="pickup" style={{ background: cardBg, border: `1px solid ${accent}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <Truck size={16} color="#db142e" />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('title')}</h2>
        {!loading && status && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            color: status === 'created' ? ink('#4ade80', dark) : ink('#f59e0b', dark),
            background: status === 'created' ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)',
          }}>
            {status === 'created' ? <CheckCircle2 size={12} /> : <Clock size={12} />} {t(`status.${status}`)}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>{t('subtitle')}</p>

      {!loading && missing && <Banner icon={<AlertTriangle size={14} color="#f59e0b" />} color="#f59e0b" body={t('needsReviewNotice')} />}
      {!loading && pending && <Banner icon={<Clock size={14} color="#f59e0b" />} color="#f59e0b" title={t('pendingTitle')} body={t('pendingNotice')} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><BrandLoader variant="inline" size={18} style={{ color: '#db142e' }} /></div>
      ) : (
        <PickupAddressFields value={form} onChange={change} errors={errors} dark={dark} disabled={saving} idPrefix="settings-pk" />
      )}

      {apiError && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '12px 0 0' }}>
          <AlertCircle size={13} /> {apiError}
        </p>
      )}
      {notice && (
        <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#4ade80', dark), margin: '12px 0 0' }}>
          <CheckCircle2 size={13} /> {notice}
        </p>
      )}

      {!loading && (
        <button onClick={save} disabled={saving} style={{
          marginTop: 16, fontSize: 13, fontWeight: 800, padding: '10px 22px', borderRadius: 999,
          background: '#db142e', border: 'none', color: '#fff', cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
        }}>
          {saving && <BrandLoader variant="inline" size={13} />} {t('save')}
        </button>
      )}
    </div>
  )
}
