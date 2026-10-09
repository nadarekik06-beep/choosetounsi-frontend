'use client'

/**
 * app/seller/settings/page.tsx
 *
 * Store profile settings: pickup address (for the courier), stock alerts and the storefront cover photo —
 * business name/avatar are shown read-only here (they're edited through the
 * seller application flow, which forces a re-review; this page must NOT
 * trigger that).
 *
 * Route: /seller/settings
 * Layout: seller dashboard layout (inherits dark theme, sidebar)
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ImageUp, CheckCircle2, AlertCircle, Store, Share2, ExternalLink } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { storePath } from '@/lib/storeLink'
import { StoreLinkPanel } from '@/app/components/seller/ShareStore'
import { storeProfileApi, storageUrl } from '@/lib/sellerApi'
import { useTheme } from '../SellerShell'
import { useTranslations } from 'next-intl'
import { ink } from '@/app/seller/ink';
import PickupAddressCard from './PickupAddressCard'
import StockAlertsCard from './StockAlertsCard'

import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'
const MAX_SIZE = 4 * 1024 * 1024 // 4MB — matches backend validation
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface StoreProfile {
  business_name: string
  business_description: string | null
  avatar: string | null
  cover_photo: string | null
}

export default function SellerSettingsPage() {
  const { dark } = useTheme()
  const t = useTranslations('seller.settings')
  const ts = useTranslations('storeShare')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile,     setProfile]     = useState<StoreProfile | null>(null)
  const [loading,     setLoading]     = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(loading)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationErr, setValidationErr] = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadOk,    setUploadOk]    = useState(false)
  const [uploadErr,   setUploadErr]   = useState<string | null>(null)

  const cardBg    = dark ? '#161b27' : '#fff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff' : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.55)' : '#5b6472'

  const [sellerId, setSellerId] = useState<number | null>(null)

  useEffect(() => {
    setSellerId(getUser()?.id ?? null)
    storeProfileApi.get()
      .then(json => { if (json.success) setProfile(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleFileSelect = (file: File | undefined) => {
    setUploadOk(false)
    setUploadErr(null)

    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setValidationErr(t('badType'))
      setSelectedFile(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_SIZE) {
      setValidationErr(t('tooLarge'))
      setSelectedFile(null)
      setPreview(null)
      return
    }

    setValidationErr(null)
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadErr(null)
    try {
      const json = await storeProfileApi.updateCoverPhoto(selectedFile)
      if (json.success) {
        setProfile(p => p ? { ...p, cover_photo: json.data.cover_photo } : p)
        setUploadOk(true)
        setSelectedFile(null)
        setPreview(null)
      } else {
        setUploadErr(json.message ?? t('uploadFailed'))
      }
    } catch (e: any) {
      setUploadErr(e?.response?.data?.message ?? t('uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <BrandLoader variant="section" theme={dark ? 'dark' : 'light'} />
      </div>
    )
  }

  const displayedCover = preview ?? storageUrl(profile?.cover_photo ?? null)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 4px' }}>{t('title')}</h1>
      <p style={{ fontSize: 13, color: textMuted, margin: '0 0 24px' }}>
        {t('subtitle')}
      </p>

      {/* Identity (read-only) */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#db142e,#7f1d1d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800,
          flexShrink: 0, overflow: 'hidden',
        }}>
          {profile?.avatar
            ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (profile?.business_name ?? '?').charAt(0).toUpperCase()
          }
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{profile?.business_name}</p>
          <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>
            {t('identityHint')}
          </p>
        </div>
      </div>

      {/* Public store link: copy, share, QR code for flyers and packaging */}
      {sellerId && profile?.business_name && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={16} color="#db142e" />
              <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{ts('cardTitle')}</h2>
            </div>
            <Link href={storePath(sellerId, profile.business_name)} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), textDecoration: 'none' }}>
              {ts('viewStore')} <ExternalLink size={12} />
            </Link>
          </div>
          <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>{ts('cardHint')}</p>
          <StoreLinkPanel store={{ id: sellerId, name: profile.business_name }} showQr dark={dark} />
        </div>
      )}

      {/* Pickup address (courier collection point) */}
      <PickupAddressCard dark={dark} cardBg={cardBg} border={border} textMain={textMain} textMuted={textMuted} />

      {/* Low-stock alerts: on/off, threshold, channel */}
      <StockAlertsCard dark={dark} cardBg={cardBg} border={border} textMain={textMain} textMuted={textMuted} />

      {/* Cover photo */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <ImageUp size={16} color="#db142e" />
          <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('coverTitle')}</h2>
        </div>
        <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>
          {t('coverHint')}
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: 'relative', width: '100%', aspectRatio: '3/1', borderRadius: 10,
            background: displayedCover ? `#000 url(${displayedCover}) center/cover no-repeat` : (dark ? '#0D1117' : '#f3f4f6'),
            border: `1.5px dashed ${border}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          {!displayedCover && (
            <div style={{ textAlign: 'center', color: textMuted }}>
              <Store size={26} style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{t('noCover')}</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />

        {validationErr && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '10px 0 0' }}>
            <AlertCircle size={13} /> {validationErr}
          </p>
        )}
        {uploadErr && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '10px 0 0' }}>
            <AlertCircle size={13} /> {uploadErr}
          </p>
        )}
        {uploadOk && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#4ade80', dark), margin: '10px 0 0' }}>
            <CheckCircle2 size={13} /> {t('updated')}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 999,
              background: 'transparent', border: `1.5px solid ${border}`, color: textMain, cursor: 'pointer',
            }}
          >
            {t('choose')}
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 999,
              background: '#db142e', border: 'none', color: '#fff',
              cursor: (!selectedFile || uploading) ? 'default' : 'pointer',
              opacity: (!selectedFile || uploading) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {uploading && <BrandLoader variant="inline" size={13} />}
            {uploading ? t('uploading') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
