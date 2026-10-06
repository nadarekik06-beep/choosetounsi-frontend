'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Camera, ArrowLeft, BadgeCheck, MailWarning, CalendarDays, PencilLine, Trash2 } from 'lucide-react'
import { useFormat } from '@/lib/i18n/useFormat'
import { profileApi, squareImage, syncSessionUser, ApiError, type Profile } from '@/lib/profileApi'
import { AvatarImage, Skeleton } from '@/components/profile/ui'
import BrandLoader from '@/components/brand/BrandLoader'

const MAX_MB = 3
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

export default function ProfileHero({ profile, onProfile, onEdit, toast }: {
  profile: Profile | null
  onProfile: (p: Profile) => void
  onEdit: () => void
  toast: (msg: string, kind?: 'success' | 'error') => void
}) {
  const t     = useTranslations('profile')
  const tRole = useTranslations('common.role')
  const fmt   = useFormat()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profile) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast(t('photo.type'), 'error'); return }
    if (file.size > 15 * 1024 * 1024) { toast(t('photo.tooBig', { max: MAX_MB }), 'error'); return }

    setBusy(true)
    try {
      const blob = await squareImage(file)                    // crop to square + shrink in the browser
      if (blob.size > MAX_MB * 1024 * 1024) { toast(t('photo.tooBig', { max: MAX_MB }), 'error'); return }
      const local = URL.createObjectURL(blob)
      setPreview(local)                                       // optimistic
      const saved = await profileApi.uploadAvatar(blob)
      syncSessionUser(saved)
      onProfile(saved)
      toast(t('photo.updated'))
    } catch (err) {
      setPreview(null)
      const api = err as ApiError
      toast(api.fields?.avatar || api.message || t('photo.type'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!profile) return
    setBusy(true)
    try {
      const saved = await profileApi.deleteAvatar()
      setPreview(null)
      syncSessionUser(saved)
      onProfile(saved)
      toast(t('photo.removed'))
    } catch (err) {
      toast((err as ApiError).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const pct  = profile?.completion.percent ?? 0
  const done = pct >= 100 || (!!profile && !profile.completion.enforced && pct >= 80)
  const roleClass = profile ? (['client', 'seller', 'admin'].includes(profile.role) ? `role-${profile.role}` : 'role-other') : ''

  return (
    <header className="pf-hero">
      <div className="pf-wrap">
        <Link href="/" className="pf-back"><ArrowLeft size={14} />{t('backHome')}</Link>

        <div className="pf-hero-row">
          {/* Avatar + completion ring */}
          <div className={`pf-avatar${done ? ' done' : ''}`}>
            <svg className="pf-ring" viewBox="0 0 112 112" width="100%" height="100%" aria-hidden>
              <circle className="ring-track" cx="56" cy="56" r={RING_R} fill="none" strokeWidth="5" />
              <circle className="ring-bar" cx="56" cy="56" r={RING_R} fill="none" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - pct / 100)} />
            </svg>
            {profile ? (
              <button type="button" className="pf-avatar-btn" onClick={() => input.current?.click()} aria-label={t('photo.change')} disabled={busy}>
                {preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={preview} alt="" className="pf-avatar-img" />
                  : <AvatarImage name={profile.name} src={profile.avatar} />}
                <span className={`pf-avatar-over${busy ? ' busy' : ''}`}>
                  {busy ? <BrandLoader variant="inline" size={18} /> : <><Camera size={18} />{t('photo.short')}</>}
                </span>
              </button>
            ) : <span className="pf-avatar-btn"><Skeleton h="100%" r={999} /></span>}
            {profile && <span className="pf-avatar-pct" title={t('completion.percent', { percent: pct })}>{pct}%</span>}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
          </div>

          <div className="pf-hero-text">
            {profile ? (
              <>
                <h1 dir="auto">{profile.name}</h1>
                <p className="pf-hero-email" dir="ltr" style={{ textAlign: 'start' }}>{profile.email}</p>
                <div className="pf-chips">
                  <span className={`pf-chip ${roleClass}`}>
                    {profile.role === 'seller' ? '🏪' : profile.role === 'admin' ? '🛡️' : '🛍️'}{' '}
                    {['client', 'seller', 'admin'].includes(profile.role) ? tRole(profile.role as 'client') : profile.role}
                  </span>
                  {profile.email_verified
                    ? <span className="pf-chip verified"><BadgeCheck size={13} />{t('verified')}</span>
                    : <span className="pf-chip unverified"><MailWarning size={13} />{t('notVerified')}</span>}
                  {profile.member_since && (
                    <span className="pf-chip ghost"><CalendarDays size={13} />{t('memberSince', { date: fmt.date(profile.member_since, { month: 'long', year: 'numeric' }) })}</span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <Skeleton w={220} h={30} /><Skeleton w={180} h={14} /><Skeleton w={260} h={22} />
              </div>
            )}
          </div>

          {profile && (
            <div className="pf-hero-actions">
              <button type="button" className="pf-btn primary" onClick={onEdit}><PencilLine size={15} />{t('editProfile')}</button>
              {profile.avatar && (
                <button type="button" className="pf-btn glass" onClick={removePhoto} disabled={busy} aria-label={t('photo.remove')} title={t('photo.remove')}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
