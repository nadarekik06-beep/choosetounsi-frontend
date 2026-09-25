'use client'

/**
 * app/seller/settings/page.tsx
 *
 * Store profile settings. Currently scoped to the storefront cover photo —
 * business name/avatar are shown read-only here (they're edited through the
 * seller application flow, which forces a re-review; this page must NOT
 * trigger that).
 *
 * Route: /seller/settings
 * Layout: seller dashboard layout (inherits dark theme, sidebar)
 */

import { useState, useEffect, useRef } from 'react'
import { ImageUp, Loader2, CheckCircle2, AlertCircle, Store } from 'lucide-react'
import { storeProfileApi, storageUrl } from '@/lib/sellerApi'
import { useTheme } from '../SellerShell'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile,     setProfile]     = useState<StoreProfile | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationErr, setValidationErr] = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadOk,    setUploadOk]    = useState(false)
  const [uploadErr,   setUploadErr]   = useState<string | null>(null)

  const cardBg    = dark ? '#161b27' : '#fff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff' : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#6b7280'

  useEffect(() => {
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
      setValidationErr('Only JPG, PNG or WEBP images are allowed.')
      setSelectedFile(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_SIZE) {
      setValidationErr('Image must be 4MB or smaller.')
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
        setUploadErr(json.message ?? 'Upload failed.')
      }
    } catch (e: any) {
      setUploadErr(e?.response?.data?.message ?? e?.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} className="animate-spin" color="#db142e" />
      </div>
    )
  }

  const displayedCover = preview ?? storageUrl(profile?.cover_photo ?? null)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 4px' }}>Store Settings</h1>
      <p style={{ fontSize: 13, color: textMuted, margin: '0 0 24px' }}>
        Manage how your storefront page appears to customers.
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
            Store name and logo are set during seller application review.
          </p>
        </div>
      </div>

      {/* Cover photo */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <ImageUp size={16} color="#db142e" />
          <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>Cover Photo</h2>
        </div>
        <p style={{ fontSize: 12, color: textMuted, margin: '0 0 14px' }}>
          Shown as the banner at the top of your public storefront. JPG, PNG or WEBP, up to 4MB.
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
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>No cover photo yet — click to upload</p>
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
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f87171', margin: '10px 0 0' }}>
            <AlertCircle size={13} /> {validationErr}
          </p>
        )}
        {uploadErr && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f87171', margin: '10px 0 0' }}>
            <AlertCircle size={13} /> {uploadErr}
          </p>
        )}
        {uploadOk && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4ade80', margin: '10px 0 0' }}>
            <CheckCircle2 size={13} /> Cover photo updated.
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
            Choose Image
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
            {uploading && <Loader2 size={13} className="animate-spin" />}
            {uploading ? 'Uploading…' : 'Save Cover Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
