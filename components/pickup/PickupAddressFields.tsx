'use client'

/**
 * The seller pickup address form, shared by the seller application
 * (become-a-vendor) and the seller settings "Adresse d'enlèvement" card.
 * Fields in the order of Intigo's "Nouvelle adresse" form, so the admin can
 * copy them over 1:1:
 *
 *   1. Adresse complète   free text
 *   2. Zone               Intigo délégation / secteur, picked from the list
 *   3. Map pin            click / drag / "Ma Position" (required)
 *   then contact, phone, postal code, notes for the courier.
 *
 * Controlled: the parent keeps the value and runs validatePickupAddress()
 * before submitting (the backend enforces the same rules).
 */

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Crosshair, LocateFixed, MapPinned } from 'lucide-react'
import ZoneCombobox from './ZoneCombobox'
import type { MapFocus } from './PickupMap'
import {
  distanceKm, GEO_MAX_ACCURACY_M, inTunisia, zoneCenter,
  type PickupAddressValue, type PickupErrors, type ZoneCenter,
} from '@/lib/pickupAddress'

const PickupMap = dynamic(() => import('./PickupMap'), {
  ssr: false,
  loading: () => <div style={{ height: 320, borderRadius: 12, background: 'rgba(127,127,127,0.08)' }} />,
})

const ZOOM = { secteur: 16, delegation: 14, gouvernorat: 11 } as const

interface Props {
  value: PickupAddressValue
  onChange: (value: PickupAddressValue) => void
  errors?: PickupErrors
  dark?: boolean
  disabled?: boolean
  idPrefix?: string
}

export default function PickupAddressFields({ value, onChange, errors = {}, dark, disabled, idPrefix = 'pk' }: Props) {
  const t = useTranslations('pickupAddress')
  // Centre of the zone it was fetched for (stale once another zone is picked)
  const [fetched,  setFetched]  = useState<{ zoneId: number; center: ZoneCenter | null } | null>(null)
  const [focus,    setFocus]    = useState<MapFocus | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const set = <K extends keyof PickupAddressValue>(key: K, v: PickupAddressValue[K]) => onChange({ ...value, [key]: v })

  // Zone picked → centre the map on it (approximate), the seller fine-tunes the pin
  useEffect(() => {
    const zone = value.zone
    if (!zone) return
    let alive = true
    zoneCenter(zone.id).then(c => {
      if (!alive) return
      setFetched({ zoneId: zone.id, center: c })
      // Recentre unless the pin is already placed close to the zone
      if (c && (value.latitude == null || value.longitude == null
        || distanceKm(c.latitude, c.longitude, value.latitude, value.longitude) > c.warn_km)) {
        setFocus({ latitude: c.latitude, longitude: c.longitude, zoom: ZOOM[c.precision] ?? 14, key: `zone-${zone.id}` })
      }
    })
    return () => { alive = false }
  }, [value.zone?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const center = fetched && fetched.zoneId === value.zone?.id ? fetched.center : null

  const distance = useMemo(() => (
    center && value.latitude != null && value.longitude != null
      ? distanceKm(center.latitude, center.longitude, value.latitude, value.longitude)
      : null
  ), [center, value.latitude, value.longitude])
  const far = distance != null && center != null && distance > center.warn_km

  const myPosition = () => {
    setGeoError(null)
    if (!('geolocation' in navigator)) { setGeoError(t('geoUnavailable')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        const { latitude, longitude, accuracy } = pos.coords
        if (!inTunisia(latitude, longitude)) { setGeoError(t('errors.pinOutside')); return }
        // A computer often guesses its position from the internet line (km off): never use an
        // imprecise position as the pin, only centre the map there and let the seller click the shop
        if (!(accuracy > 0) || accuracy > GEO_MAX_ACCURACY_M) {
          setFocus({ latitude, longitude, zoom: 16, key: `me-${Date.now()}` })
          setGeoError(t('geoImprecise', { m: Math.round(accuracy || 0) }))
          return
        }
        onChange({ ...value, latitude: Number(latitude.toFixed(7)), longitude: Number(longitude.toFixed(7)) })
        setFocus({ latitude, longitude, zoom: 17, key: `me-${Date.now()}` })
      },
      err => {
        setLocating(false)
        setGeoError(err.code === err.PERMISSION_DENIED ? t('geoDenied') : t('geoUnavailable'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const placePin = (lat: number, lng: number) => {
    setGeoError(null)
    onChange({ ...value, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) })
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const text  = dark ? '#fff' : '#1f2937'
  const muted = dark ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const input = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    background: dark ? '#0D1117' : '#fff', color: text,
    border: `1.5px solid ${err ? '#ef4444' : dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb'}`,
  })
  const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.85)' : '#374151', marginBottom: 6 }
  const err = (k: keyof PickupErrors) => {
    const e = errors[k]
    if (!e) return null
    // Client-side keys are translated; backend messages arrive as sentences
    const msg = /^[a-zA-Z]+$/.test(e) ? t(`errors.${e}`) : e
    return <p role="alert" style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0', fontWeight: 600 }}>{msg}</p>
  }
  const id = (k: string) => `${idPrefix}-${k}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Adresse complète */}
      <div>
        <label style={label} htmlFor={id('adresse')}>{t('adresse')} *</label>
        <input id={id('adresse')} dir="auto" autoComplete="street-address" disabled={disabled}
          placeholder={t('adressePlaceholder')} maxLength={200}
          value={value.adresse_complete} onChange={e => set('adresse_complete', e.target.value)}
          style={input(errors.adresse_complete)} />
        {err('adresse_complete')}
      </div>

      {/* 2. Zone (Délégation/Secteur) */}
      <div>
        <label style={label} htmlFor={id('zone')}>{t('zone')} *</label>
        <ZoneCombobox id={id('zone')} value={value.zone} onChange={z => set('zone', z)} error={errors.zone} dark={dark} disabled={disabled} />
        {value.zone
          ? <p style={{ fontSize: 12, color: muted, margin: '5px 0 0' }}>{t('gouvernorat')} : <b dir="ltr" style={{ color: text }}>{value.zone.gouvernorat}</b></p>
          : <p style={{ fontSize: 12, color: muted, margin: '5px 0 0' }}>{t('zoneHint')}</p>}
        {err('zone')}
      </div>

      {/* 3. Map */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ ...label, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPinned size={15} color="#db142e" aria-hidden /> {t('map')} *
          </span>
          <button type="button" onClick={myPosition} disabled={disabled || locating}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: disabled || locating ? 'default' : 'pointer',
              background: dark ? 'rgba(219,20,46,0.15)' : '#fef2f2', color: '#db142e', border: '1px solid rgba(219,20,46,0.35)',
              opacity: locating ? 0.7 : 1,
            }}>
            <LocateFixed size={14} aria-hidden /> {locating ? t('locating') : t('myPosition')}
          </button>
        </div>
        <p style={{ fontSize: 12, color: muted, margin: '0 0 8px' }}>{t('mapHelp')}</p>
        <PickupMap
          latitude={value.latitude}
          longitude={value.longitude}
          onChange={disabled ? undefined : placePin}
          focus={focus}
          dark={dark}
          labels={{ loading: t('mapLoading'), failed: t('mapFailed'), zoomIn: t('mapZoomIn') }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: muted }}>
          <Crosshair size={13} aria-hidden />
          {value.latitude != null && value.longitude != null
            ? <span>{t('coords')} : <b dir="ltr" style={{ color: text, fontVariantNumeric: 'tabular-nums' }}>{value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</b></span>
            : <span>{t('pinMissing')}</span>}
        </div>
        {far && (
          <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)' }}>
            <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: dark ? '#fbbf24' : '#92400e' }}>
              {t('pinFar', { km: Math.round(distance!), zone: value.zone?.display_label ?? '' })}
            </p>
          </div>
        )}
        {geoError && <p role="alert" style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0', fontWeight: 600 }}>{geoError}</p>}
        {err('pin')}
      </div>

      {/* Contact, phone, postal code, notes */}
      <div className="ct-pickup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={label} htmlFor={id('contact')}>{t('contact')} *</label>
          <input id={id('contact')} dir="auto" autoComplete="name" disabled={disabled} maxLength={191}
            value={value.contact_name} onChange={e => set('contact_name', e.target.value)} style={input(errors.contact_name)} />
          {err('contact_name')}
        </div>
        <div>
          <label style={label} htmlFor={id('phone')}>{t('phone')} *</label>
          <input id={id('phone')} type="tel" dir="ltr" inputMode="tel" autoComplete="tel-national" placeholder="22 123 456" disabled={disabled}
            value={value.phone} onChange={e => set('phone', e.target.value)} style={input(errors.phone)} />
          {err('phone')}
        </div>
        <div>
          <label style={label} htmlFor={id('postal')}>{t('postalCode')} *</label>
          <input id={id('postal')} dir="ltr" inputMode="numeric" autoComplete="postal-code" placeholder="1000" maxLength={4} disabled={disabled}
            value={value.code_postal} onChange={e => set('code_postal', e.target.value.replace(/\D/g, '').slice(0, 4))} style={input(errors.code_postal)} />
          {err('code_postal')}
        </div>
        <div>
          <label style={label} htmlFor={id('notes')}>{t('notes')}</label>
          <input id={id('notes')} dir="auto" placeholder={t('notesPlaceholder')} maxLength={500} disabled={disabled}
            value={value.indications} onChange={e => set('indications', e.target.value)} style={input(errors.indications)} />
          {err('indications')}
        </div>
      </div>
      <style>{`@media (max-width: 560px) { .ct-pickup-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
