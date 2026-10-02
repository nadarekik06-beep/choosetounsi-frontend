'use client'

/**
 * Mandatory profile completion for shoppers (ProfileGate sends them here):
 * 1. about you — first name, last name, phone
 * 2. a delivery address (governorate, city, street) — reused by checkout
 * Then on to preference onboarding (if not done yet) or back where they were.
 * There is no skip: the backend refuses checkout until this is done.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LogOut, ShieldCheck, Truck, UserRound, MapPin, Check } from 'lucide-react'
import { getUser, isAuthenticated, logout, updateSessionUser } from '@/lib/auth'
import { addressApi, profileApi, syncSessionUser, type Profile, type SavedAddress } from '@/lib/profileApi'
import PersonalInfoForm from '@/components/profile/PersonalInfoForm'
import AddressForm from '@/components/profile/AddressForm'
import { Skeleton } from '@/components/profile/ui'
import '@/components/profile/profile.css'

/** Only same-site paths: never bounce to another origin. */
function safeRedirect(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/complete-profile')) return '/'
  return raw
}

function CompleteProfile() {
  const t      = useTranslations('completeProfile')
  const router = useRouter()
  const params = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [step,      setStep]      = useState<1 | 2>(1)
  const [error,     setError]     = useState('')
  const [finishing, setFinishing] = useState(false)

  const finish = (p: Profile) => {
    setFinishing(true)
    syncSessionUser(p)
    const user = getUser()
    if (user) updateSessionUser({ ...user, profile_completed: true })
    const next = user && user.role === 'client' && !user.onboarding_completed
      ? `/onboarding?redirect=${encodeURIComponent(redirect)}`
      : redirect
    setTimeout(() => router.replace(next), 900)
  }

  useEffect(() => {
    if (!isAuthenticated()) { router.replace(`/auth/login?callbackUrl=${encodeURIComponent('/complete-profile')}`); return }
    if (getUser()?.role !== 'client') { router.replace(redirect); return }
    Promise.all([profileApi.get(), addressApi.list()])
      .then(([p, a]) => {
        if (p.completion.complete) { finish(p); setProfile(p); return }
        setProfile(p)
        setAddresses(a)
        const personalDone = !p.completion.missing.some(m => ['first_name', 'last_name', 'phone'].includes(m.field))
        if (personalDone) setStep(2)
      })
      .catch(() => setError(t('loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const afterPersonal = async (p: Profile) => {
    setProfile(p)
    if (p.completion.complete) { finish(p); return }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const afterAddress = async () => {
    try {
      const p = await profileApi.get()
      setProfile(p)
      if (p.completion.complete) finish(p)
      else setStep(p.completion.missing.some(m => m.field !== 'address' && m.required) ? 1 : 2)
    } catch { setError(t('loadError')) }
  }

  const doLogout = async () => { await logout(); router.replace('/auth/login') }

  // An existing address that predates structured addresses only needs completing.
  const incomplete = addresses.find(a => !a.delegation || !a.address)

  return (
    <div className="pf-root">
      <div className="pf-hero" style={{ paddingBottom: 110 }}>
        <div className="pf-wrap" style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
            <span style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>Choose<span style={{ color: '#4ade80' }}>Tounsi</span></span>
            <button type="button" className="pf-btn glass sm" onClick={doLogout}><LogOut size={14} />{t('logout')}</button>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, fontSize: 'clamp(1.6rem,5vw,2.2rem)', margin: '0 0 8px', lineHeight: 1.15 }}>
            {profile ? t('title', { name: profile.first_name ?? profile.suggested_first_name ?? '' }) : t('titleNoName')}
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.5 }}>{t('subtitle')}</p>
        </div>
      </div>

      <main className="pf-onb">
        <div className="pf-card" style={{ boxShadow: '0 18px 50px rgba(0,0,0,0.08)' }}>
          {finishing ? (
            <div className="pf-empty" role="status">
              <div className="pf-empty-art" style={{ color: '#198f41', background: 'radial-gradient(circle at 30% 25%, #fff 0%, #dcf5e5 70%)' }}><Check size={34} /></div>
              <h3>{t('done')}</h3>
              <p>{t('doneBody')}</p>
            </div>
          ) : error ? (
            <div className="pf-alert error" role="alert">{error}</div>
          ) : !profile ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <Skeleton h={6} /><Skeleton w="60%" h={20} /><Skeleton h={44} /><Skeleton h={44} /><Skeleton h={44} />
            </div>
          ) : (
            <>
              <div className="pf-steps" aria-hidden><span className="on" /><span className={step === 2 ? 'on' : ''} /></div>
              <p className="pf-section-title" style={{ marginBottom: 4 }}>{t('stepOf', { current: step, total: 2 })}</p>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                {step === 1 ? <UserRound size={19} color="#db142e" /> : <MapPin size={19} color="#db142e" />}
                {step === 1 ? t('step1') : t('step2')}
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: '0.84rem', color: '#6b6b76' }}>{step === 1 ? t('step1Body') : t('step2Body')}</p>

              {step === 1 ? (
                <PersonalInfoForm profile={profile} onSaved={afterPersonal} showOptional={false} submitLabel={t('continue')} />
              ) : (
                <AddressForm
                  key={incomplete?.id ?? 'new'}
                  initial={incomplete}
                  forceDefault={addresses.length === 0}
                  prefill={{
                    recipient_name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
                    phone: profile.phone ?? '',
                  }}
                  onSaved={afterAddress}
                  onCancel={() => setStep(1)}
                  submitLabel={t('finish')}
                  cancelLabel={t('back')}
                />
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18, color: '#6b6b76', fontSize: '0.78rem', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={15} color="#198f41" />{t('privacy')}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Truck size={15} color="#db142e" />{t('whyDelivery')}</span>
        </div>
      </main>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="pf-root" />}>
      <CompleteProfile />
    </Suspense>
  )
}
