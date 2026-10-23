'use client'

/**
 * "Profil de la boutique": logo, description and activity categories.
 * Each section saves on its own and is live on the store page right away
 * (the admin is notified and keeps the history). The store name stays
 * admin-only.
 *
 *   Logo        JPG / PNG / WebP ≤ 4 MB, cropped square here, re-encoded server-side
 *   Description plain text, line breaks kept, 2000 characters max
 *   Categories  chips from the platform list (same as the application), max 5;
 *               information only, products can use any category
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle2, ImageUp, Plus, Search, Store, Tag, X, ZoomIn, FileText } from 'lucide-react'
import { storeProfileApi, type StoreProfileData } from '@/lib/sellerApi'
import { API_BASE } from '@/lib/constants'
import { ink } from '@/app/seller/ink'
import BrandLoader from '@/components/brand/BrandLoader'

const MAX_SIZE        = 4 * 1024 * 1024          // same as the application / backend
const ACCEPTED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_DESCRIPTION = 2000
const MAX_CATEGORIES  = 5
const CROP_VIEW       = 240                       // crop square on screen (px)
const LOGO_OUT        = 512                       // exported square (px), server keeps ≤ 512

interface PlatformCategory { name: string; label: string }

type Props = {
  dark: boolean; cardBg: string; border: string; textMain: string; textMuted: string
  initial: StoreProfileData
  onLogoChange?: (url: string | null) => void
}

function firstError(err: unknown, fallback: string): string {
  const data   = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
  const first  = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  return first ?? data?.message ?? fallback
}

// ── Square crop: drag to move, slider to zoom ────────────────────────────────

function LogoCropper({ src, dark, border, textMuted, onCancel, onConfirm, t }: {
  src: string; dark: boolean; border: string; textMuted: string
  onCancel: () => void; onConfirm: (blob: Blob, previewUrl: string) => void
  t: ReturnType<typeof useTranslations>
}) {
  const [img,  setImg]  = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos,  setPos]  = useState({ x: 0, y: 0 })   // image top-left inside the square
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const i = new Image()
    i.onload = () => {
      setImg(i)
      const s = CROP_VIEW / Math.min(i.naturalWidth, i.naturalHeight)
      setPos({ x: (CROP_VIEW - i.naturalWidth * s) / 2, y: (CROP_VIEW - i.naturalHeight * s) / 2 })
    }
    i.src = src
  }, [src])

  const scale = img ? (CROP_VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * zoom : 1
  const clamp = (p: { x: number; y: number }, s = scale) => img ? {
    x: Math.min(0, Math.max(CROP_VIEW - img.naturalWidth * s, p.x)),
    y: Math.min(0, Math.max(CROP_VIEW - img.naturalHeight * s, p.y)),
  } : p

  const changeZoom = (z: number) => {
    if (!img) return
    const base = CROP_VIEW / Math.min(img.naturalWidth, img.naturalHeight)
    const old = base * zoom, next = base * z
    // keep the centre of the square still while zooming
    const cx = (CROP_VIEW / 2 - pos.x) / old, cy = (CROP_VIEW / 2 - pos.y) / old
    setZoom(z)
    setPos(clamp({ x: CROP_VIEW / 2 - cx * next, y: CROP_VIEW / 2 - cy * next }, next))
  }

  const confirm = () => {
    if (!img) return
    const srcSize = CROP_VIEW / scale
    const out = Math.round(Math.min(LOGO_OUT, srcSize))
    const canvas = document.createElement('canvas')
    canvas.width = out; canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, -pos.x / scale, -pos.y / scale, srcSize, srcSize, 0, 0, out, out)
    const done = (blob: Blob | null) => { if (blob) onConfirm(blob, canvas.toDataURL('image/png')) }
    canvas.toBlob(blob => {
      // Browsers without WebP encoding return PNG (or null): fall back to PNG
      if (blob && blob.type === 'image/webp') done(blob)
      else canvas.toBlob(done, 'image/png')
    }, 'image/webp', 0.92)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, border: `1px dashed ${border}`, background: dark ? '#0D1117' : '#f9fafb' }}>
      <p style={{ fontSize: 12, color: textMuted, margin: 0, textAlign: 'center' }}>{t('cropHint')}</p>
      <div
        dir="ltr"
        role="img"
        aria-label={t('cropArea')}
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y } }}
        onPointerMove={e => { const d = drag.current; if (d) setPos(clamp({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py })) }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        style={{
          position: 'relative', width: CROP_VIEW, height: CROP_VIEW, maxWidth: '100%', overflow: 'hidden',
          borderRadius: 12, background: '#fff', cursor: 'grab', touchAction: 'none', userSelect: 'none', flexShrink: 0,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
        }}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" draggable={false} style={{
            position: 'absolute', left: pos.x, top: pos.y, maxWidth: 'none',
            width: img.naturalWidth * scale, height: img.naturalHeight * scale, pointerEvents: 'none',
          }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><BrandLoader variant="inline" size={18} /></div>
        )}
        {/* round guide: how the logo shows on the store page */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 0 999px rgba(0,0,0,0.28)', pointerEvents: 'none' }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: CROP_VIEW, fontSize: 12, color: textMuted }}>
        <ZoomIn size={14} aria-hidden />
        <span className="sr-only">{t('zoom')}</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => changeZoom(Number(e.target.value))}
          aria-label={t('zoom')} style={{ flex: 1, minWidth: 0, accentColor: '#db142e' }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={onCancel} style={ghostBtn(border, dark)}>{t('cancel')}</button>
        <button type="button" onClick={confirm} disabled={!img} style={primaryBtn(!img)}>{t('useCrop')}</button>
      </div>
    </div>
  )
}

const ghostBtn = (border: string, dark: boolean): React.CSSProperties => ({
  fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 999, background: 'transparent',
  border: `1.5px solid ${border}`, color: dark ? '#fff' : '#111', cursor: 'pointer',
})
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 999, background: '#db142e', border: 'none', color: '#fff',
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6,
})

function Feedback({ ok, error, dark }: { ok: string | null; error: string | null; dark: boolean }) {
  if (error) return <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#f87171', dark), margin: '10px 0 0' }}><AlertCircle size={13} style={{ flexShrink: 0 }} /> {error}</p>
  if (ok)    return <p role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: ink('#4ade80', dark), margin: '10px 0 0' }}><CheckCircle2 size={13} style={{ flexShrink: 0 }} /> {ok}</p>
  return null
}

export default function StoreProfileCard({ dark, cardBg, border, textMain, textMuted, initial, onLogoChange }: Props) {
  const t      = useTranslations('seller.settings.profile')
  const locale = useLocale()

  const [profile, setProfile] = useState<StoreProfileData>(initial)

  // ── Logo ──
  const fileRef = useRef<HTMLInputElement>(null)
  const [cropSrc,     setCropSrc]     = useState<string | null>(null)
  const [logoBlob,    setLogoBlob]    = useState<Blob | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoBusy,    setLogoBusy]    = useState(false)
  const [logoOk,      setLogoOk]      = useState<string | null>(null)
  const [logoErr,     setLogoErr]     = useState<string | null>(null)

  // ── Description ──
  const [description, setDescription] = useState(initial.business_description ?? '')
  const [descBusy,    setDescBusy]    = useState(false)
  const [descOk,      setDescOk]      = useState<string | null>(null)
  const [descErr,     setDescErr]     = useState<string | null>(null)

  // ── Categories ──
  const [platform,   setPlatform]   = useState<PlatformCategory[]>([])
  const [categories, setCategories] = useState<string[]>(initial.business_categories ?? [])
  const [picker,     setPicker]     = useState(false)
  const [query,      setQuery]      = useState('')
  const [catBusy,    setCatBusy]    = useState(false)
  const [catOk,      setCatOk]      = useState<string | null>(null)
  const [catErr,     setCatErr]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/categories`, { headers: { Accept: 'application/json', 'Accept-Language': locale } })
      .then(r => r.json())
      .then(json => setPlatform((json?.data ?? []).map((c: { name: string; base_name?: string }) => ({ name: c.base_name ?? c.name, label: c.name }))))
      .catch(() => {})
  }, [locale])

  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc) }, [cropSrc])

  const labelOf = (name: string) => platform.find(c => c.name === name)?.label ?? name

  // ── Logo handlers ──
  const pickFile = (file: File | undefined) => {
    setLogoOk(null); setLogoErr(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) { setLogoErr(t('logoType')); return }
    if (file.size > MAX_SIZE) { setLogoErr(t('logoTooLarge')); return }
    setLogoBlob(null); setLogoPreview(null)
    setCropSrc(URL.createObjectURL(file))
  }

  const saveLogo = async () => {
    if (!logoBlob) return
    setLogoBusy(true); setLogoErr(null); setLogoOk(null)
    try {
      const json = await storeProfileApi.updateLogo(logoBlob, locale)
      setProfile(json.data)
      onLogoChange?.(json.data.logo)
      setLogoBlob(null); setLogoPreview(null)
      setLogoOk(json.message ?? t('logoSaved'))
    } catch (err) {
      setLogoErr(firstError(err, t('saveFailed')))
    } finally {
      setLogoBusy(false)
    }
  }

  // ── Description handlers ──
  const descChanged = description.trim() !== (profile.business_description ?? '').trim()
  const saveDescription = async () => {
    setDescBusy(true); setDescErr(null); setDescOk(null)
    try {
      const json = await storeProfileApi.updateDescription(description, locale)
      setProfile(json.data)
      setDescription(json.data.business_description ?? '')
      setDescOk(json.message ?? t('descriptionSaved'))
    } catch (err) {
      setDescErr(firstError(err, t('saveFailed')))
    } finally {
      setDescBusy(false)
    }
  }

  // ── Category handlers ──
  const catChanged = categories.join('\u0001') !== (profile.business_categories ?? []).join('\u0001')
  const atMax = categories.length >= MAX_CATEGORIES
  const options = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return platform.filter(c => !categories.includes(c.name)
      && (!q || c.label.toLocaleLowerCase().includes(q) || c.name.toLocaleLowerCase().includes(q)))
  }, [platform, categories, query])

  const addCategory = (name: string) => {
    if (atMax || categories.includes(name)) return
    setCategories(prev => [...prev, name]); setCatOk(null); setCatErr(null)
    setQuery('')
    if (categories.length + 1 >= MAX_CATEGORIES) setPicker(false)
  }
  const removeCategory = (name: string) => { setCategories(prev => prev.filter(c => c !== name)); setCatOk(null); setCatErr(null) }

  const saveCategories = async () => {
    if (categories.length === 0) { setCatErr(t('categoriesMin')); return }
    setCatBusy(true); setCatErr(null); setCatOk(null)
    try {
      const json = await storeProfileApi.updateCategories(categories, locale)
      setProfile(json.data)
      setCategories(json.data.business_categories)
      setCatOk(json.message ?? t('categoriesSaved'))
      setPicker(false)
    } catch (err) {
      setCatErr(firstError(err, t('saveFailed')))
    } finally {
      setCatBusy(false)
    }
  }

  // ── Styles ──
  const section: React.CSSProperties = { paddingTop: 16, marginTop: 16, borderTop: `1px solid ${border}` }
  const h3: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: textMain, margin: '0 0 4px' }
  const hint: React.CSSProperties = { fontSize: 12, color: textMuted, margin: '0 0 12px' }
  const shownLogo = logoPreview ?? profile.logo

  return (
    <div id="store-profile" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 18, marginBottom: 20, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Store size={16} color="#db142e" />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: textMain, margin: 0 }}>{t('title')}</h2>
      </div>
      <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{t('subtitle')}</p>

      {/* ── Logo ── */}
      <div style={section}>
        <h3 style={h3}><ImageUp size={14} color="#db142e" /> {t('logoTitle')}</h3>
        <p style={hint}>{t('logoHint')}</p>

        {cropSrc ? (
          <LogoCropper src={cropSrc} dark={dark} border={border} textMuted={textMuted} t={t}
            onCancel={() => setCropSrc(null)}
            onConfirm={(blob, url) => { setLogoBlob(blob); setLogoPreview(url); setCropSrc(null) }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg,#db142e,#7f1d1d)', color: '#fff', fontWeight: 900, fontSize: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: logoPreview ? '0 0 0 3px #db142e' : `0 0 0 1px ${border}`,
            }}>
              {shownLogo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={shownLogo} alt={t('logoAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#fff' }} />
                : (profile.business_name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={ghostBtn(border, dark)}>{t('changeLogo')}</button>
              {logoBlob && (
                <>
                  <button type="button" onClick={() => { setLogoBlob(null); setLogoPreview(null) }} style={ghostBtn(border, dark)}>{t('cancel')}</button>
                  <button type="button" onClick={saveLogo} disabled={logoBusy} style={primaryBtn(logoBusy)}>
                    {logoBusy && <BrandLoader variant="inline" size={13} />}{logoBusy ? t('saving') : t('saveLogo')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {logoBlob && !cropSrc && <p style={{ ...hint, margin: '8px 0 0' }}>{t('logoPreviewHint')}</p>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
          onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
        <Feedback ok={logoOk} error={logoErr} dark={dark} />
      </div>

      {/* ── Description ── */}
      <div style={section}>
        <h3 style={h3}><FileText size={14} color="#db142e" /> <label htmlFor="sp-description">{t('descriptionTitle')}</label></h3>
        <p style={hint}>{t('descriptionHint')}</p>
        <textarea
          id="sp-description" rows={6} maxLength={MAX_DESCRIPTION} dir="auto"
          value={description}
          onChange={e => { setDescription(e.target.value.slice(0, MAX_DESCRIPTION)); setDescOk(null); setDescErr(null) }}
          placeholder={t('descriptionPlaceholder')}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 10, padding: '10px 12px',
            fontSize: 14, lineHeight: 1.55, fontFamily: 'inherit', outline: 'none',
            background: dark ? '#0D1117' : '#fff', color: textMain, border: `1.5px solid ${border}`,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <span aria-live="polite" style={{ fontSize: 11, fontWeight: 700, color: description.length >= MAX_DESCRIPTION ? ink('#f87171', dark) : textMuted }}>
            {t('counter', { count: description.length, max: MAX_DESCRIPTION })}
          </span>
          <button type="button" onClick={saveDescription} disabled={!descChanged || descBusy} style={primaryBtn(!descChanged || descBusy)}>
            {descBusy && <BrandLoader variant="inline" size={13} />}{descBusy ? t('saving') : t('saveDescription')}
          </button>
        </div>
        <Feedback ok={descOk} error={descErr} dark={dark} />
      </div>

      {/* ── Activity categories ── */}
      <div style={section}>
        <h3 style={h3}><Tag size={14} color="#db142e" /> {t('categoriesTitle')}</h3>
        <p style={hint}>{t('categoriesHint', { max: MAX_CATEGORIES })}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {categories.map(name => (
            <span key={name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%', paddingTop: 6, paddingBottom: 6,
              paddingInlineStart: 12, paddingInlineEnd: 8, borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.07)', color: ink('#f87171', dark), border: '1px solid rgba(219,20,46,0.25)',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(name)}</span>
              <button type="button" onClick={() => removeCategory(name)} aria-label={t('removeCategory', { name: labelOf(name) })}
                style={{ display: 'flex', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'inherit', borderRadius: 999 }}>
                <X size={13} />
              </button>
            </span>
          ))}
          {!atMax && (
            <button type="button" onClick={() => setPicker(p => !p)} aria-expanded={picker} aria-controls="sp-category-picker"
              style={{ ...ghostBtn(border, dark), padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, borderStyle: 'dashed' }}>
              <Plus size={13} /> {t('addCategory')}
            </button>
          )}
        </div>
        {atMax && <p style={{ ...hint, margin: '8px 0 0' }}>{t('categoriesMax', { max: MAX_CATEGORIES })}</p>}

        {picker && !atMax && (
          <div id="sp-category-picker" style={{ marginTop: 10, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', background: dark ? '#0D1117' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${border}` }}>
              <Search size={14} color={textMuted} aria-hidden />
              <input autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchCategory')}
                aria-label={t('searchCategory')}
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: textMain, fontSize: 14, fontFamily: 'inherit' }} />
            </div>
            <ul role="listbox" aria-label={t('categoriesTitle')} style={{ listStyle: 'none', margin: 0, padding: 4, maxHeight: 240, overflowY: 'auto' }}>
              {platform.length === 0 && <li style={{ padding: 12, display: 'flex', justifyContent: 'center' }}><BrandLoader variant="inline" size={16} /></li>}
              {platform.length > 0 && options.length === 0 && <li style={{ padding: '10px 12px', fontSize: 12, color: textMuted }}>{t('noCategory')}</li>}
              {options.map(c => (
                <li key={c.name} role="option" aria-selected={false}>
                  <button type="button" onClick={() => addCategory(c.name)} style={{
                    width: '100%', textAlign: 'start', background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px',
                    fontSize: 13, fontWeight: 600, color: textMain, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {catChanged && (
            <button type="button" onClick={() => { setCategories(profile.business_categories ?? []); setCatErr(null) }} style={ghostBtn(border, dark)}>{t('cancel')}</button>
          )}
          <button type="button" onClick={saveCategories} disabled={!catChanged || catBusy} style={primaryBtn(!catChanged || catBusy)}>
            {catBusy && <BrandLoader variant="inline" size={13} />}{catBusy ? t('saving') : t('saveCategories')}
          </button>
        </div>
        <Feedback ok={catOk} error={catErr} dark={dark} />
      </div>
    </div>
  )
}
