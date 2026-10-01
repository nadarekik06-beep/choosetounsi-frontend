// app/become-a-vendor/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { isAuthenticated } from '@/lib/auth'
import { subscriptionApi, ActivePlan } from '@/lib/subscriptionApi'
import { useSellerPlans, type PlanKey } from '@/lib/platformApi'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
import SubscriptionUpgradePage from '@/app/components/seller/SubscriptionUpgradePage'
import Navbar from '@/app/components/layout/Navbar'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import VendorHero from './_components/VendorHero'
import StatsStrip from './_components/StatsStrip'
import WhySection from './_components/WhySection'
import HowItWorks from './_components/HowItWorks'
import PlansSection from './_components/PlansSection'
import SellerShowcase from './_components/SellerShowcase'
import FaqSection from './_components/FaqSection'
import FinalCta from './_components/FinalCta'
import StickyMobileCta from './_components/StickyMobileCta'
import LockedPlanModal from './_components/LockedPlanModal'
import ApplicationForm, { type ExistingApplication } from './_components/ApplicationForm'
import { SectionHeading, scrollToEl, useLandingData } from './_components/shared'
import './_components/landing.css'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800&display=swap');`

export default function BecomeVendorPage() {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing')
  const tc = useTranslations('common')
  const router    = useRouter()
  const reduced   = useReducedMotion()
  const livePlans = useSellerPlans()
  const landing   = useLandingData()

  const heroRef  = useRef<HTMLElement>(null)
  const plansRef = useRef<HTMLElement>(null)
  const formRef  = useRef<HTMLElement>(null)

  const [sellerState, setSellerState] = useState<{
    checked: boolean; isApprovedSeller: boolean; currentPlan: ActivePlan
  }>({ checked: false, isApprovedSeller: false, currentPlan: 'free' })

  const [mounted,     setMounted]     = useState(false)
  const [lockedModal, setLockedModal] = useState<'red' | 'black' | null>(null)
  const [success,     setSuccess]     = useState<{ wasUpdate: boolean } | null>(null)
  const [appStatus,   setAppStatus]   = useState<ExistingApplication['status'] | null>(null)

  // ── Mount: auth gate + seller status (unchanged) ─────────────────────────
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/become-a-vendor')
      return
    }
    subscriptionApi.getStatus()
      .then(status => {
        if (status?.status === 'approved') {
          setSellerState({ checked: true, isApprovedSeller: true, currentPlan: (status.plan as ActivePlan) ?? 'free' })
        } else {
          setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
        }
      })
      .catch(() => {
        setSellerState({ checked: true, isApprovedSeller: false, currentPlan: 'free' })
      })
  }, [router])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockedModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToForm  = useCallback(() => scrollToEl(formRef.current, reduced), [reduced])
  const scrollToPlans = useCallback(() => scrollToEl(plansRef.current, reduced), [reduced])
  const handleGreenClick = useCallback(() => { setTimeout(scrollToForm, 100) }, [scrollToForm])

  // Plan selection logic as before: Green → application form, Red/Black → "approval first" modal.
  const selectPlan = useCallback((key: PlanKey) => {
    if (key === 'free') handleGreenClick()
    else setLockedModal(key)
  }, [handleGreenClick])

  const handleStatus = useCallback((s: ExistingApplication['status'] | null) => setAppStatus(s), [])
  const handleSuccess = useCallback((wasUpdate: boolean) => {
    setSuccess({ wasUpdate })
    window.scrollTo({ top: 0 })
  }, [])

  // ── Render guards ─────────────────────────────────────────────────────────

  // Hold the page's height while the seller status loads, otherwise the root
  // layout's footer is briefly the only thing on screen.
  if (!mounted || !sellerState.checked) {
    return (
      <>
        <Navbar />
        <div className="vl-loading" role="status" aria-live="polite">
          <Loader2 size={28} className="animate-spin" aria-hidden="true" />
          <span className="sr-only">{tc('loading')}</span>
        </div>
      </>
    )
  }

  if (sellerState.isApprovedSeller) {
    return (
      <SubscriptionUpgradePage
        currentPlan={sellerState.currentPlan}
        onUpgradeSuccess={(newPlan: 'red' | 'black') => {
          setSellerState(prev => ({ ...prev, currentPlan: newPlan }))
        }}
      />
    )
  }

  if (success) {
    return (
      <>
        <style>{FONTS}</style>
        <Navbar />
        <main className="vl vl-done">
          <TunisianPattern color="#198f41" className="vl-pattern" />
          <div className="vl-done__card">
            <div className="vl-done__icon"><CheckCircle size={44} aria-hidden="true" /></div>
            <h1 className="vl-title vl-done__title">
              {success.wasUpdate ? t('success.updatedTitle') : t('success.submittedTitle')}
            </h1>
            <p className="vl-done__p">{success.wasUpdate ? t('success.updatedBody') : t('success.submittedBody')}</p>
            <p className="vl-done__p">
              {t.rich('success.planNote', { b: c => <strong className="vl-done__strong">{c}</strong> })}
            </p>
            <p className="vl-done__note">{t('success.upgradeNote')}</p>
            <Link href="/" className="vl-btn vl-btn--primary">{tc('backHome')}</Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{FONTS}</style>
      <Navbar />

      {lockedModal && (
        <LockedPlanModal planKey={lockedModal} onClose={() => setLockedModal(null)} onScrollToForm={handleGreenClick} />
      )}

      <main className="vl">
        <VendorHero ref={heroRef} onPrimary={scrollToForm} onPlans={scrollToPlans} hasApplication={appStatus !== null} />
        <StatsStrip stats={landing.data?.stats ?? null} failed={landing.failed} />
        <WhySection />
        <HowItWorks />
        <PlansSection ref={plansRef} plans={livePlans} onSelect={selectPlan} />
        <SellerShowcase sellers={landing.data?.sellers} />

        {/* ══ APPLICATION FORM ══ */}
        <section ref={formRef} id="apply" className="vl-section vl-apply" aria-labelledby="vl-apply-title">
          <TunisianPattern color="#198f41" className="vl-pattern" />
          <div className="vl-container vl-apply__inner">
            <SectionHeading id="vl-apply-title" tone="green" eyebrow={t('formEyebrow')}
              line1={tl('form.title1')} line2={tl('form.title2')} lead={t('formSubtitle')} />
            <ApplicationForm onSuccess={handleSuccess} onStatus={handleStatus} scrollToForm={scrollToForm} />
          </div>
        </section>

        <FaqSection plans={livePlans} />
        <FinalCta onClick={scrollToForm} />
      </main>

      <StickyMobileCta heroRef={heroRef} formRef={formRef} onClick={scrollToForm} />
    </>
  )
}
