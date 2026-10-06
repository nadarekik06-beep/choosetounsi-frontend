// app/become-a-vendor/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { isAuthenticated } from '@/lib/auth'
import { useSellerPlans, type PlanKey } from '@/lib/platformApi'
import { useReducedMotion } from '@/app/hooks/useReducedMotion'
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
import { PendingHero, PendingNext } from './_components/PendingView'
import SellerView from './_components/seller/SellerView'
import { loadVendorState, type VendorState } from './_components/vendorState'
import { SectionHeading, scrollToEl, useLandingData } from './_components/shared'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import './_components/landing.css'
import './_components/seller.css'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700;800&display=swap');`

/** Neutral hero-shaped placeholder while role + subscription load: no flash of the wrong variant. */
function PageSkeleton({ label }: { label: string }) {
  return (
    <main className="vl" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="vl-hero vl-skel">
        <div className="vl-container vl-hero__grid">
          <div className="vl-skel__copy">
            <i className="vl-skel__line vl-skel__line--xs" />
            <i className="vl-skel__line vl-skel__line--xl" />
            <i className="vl-skel__line vl-skel__line--lg" />
            <i className="vl-skel__line vl-skel__line--md" />
            <span className="vl-skel__btns"><i /><i /></span>
          </div>
          <i className="vl-skel__stage" />
        </div>
      </div>
    </main>
  )
}

export default function BecomeVendorPage() {
  const t  = useTranslations('vendor')
  const tl = useTranslations('vendor.landing')
  const tc = useTranslations('common')
  const router    = useRouter()
  const reduced   = useReducedMotion()
  const livePlans = useSellerPlans()

  const heroRef  = useRef<HTMLElement>(null)
  const plansRef = useRef<HTMLElement>(null)
  const formRef  = useRef<HTMLElement>(null)

  const [mounted,     setMounted]     = useState(false)
  const [vendor,      setVendor]      = useState<VendorState | null>(null)
  // holds the navigation loader until the first load is done
  usePageLoading(!mounted || !vendor)
  const [lockedModal, setLockedModal] = useState<'red' | 'black' | null>(null)
  const [success,     setSuccess]     = useState<{ wasUpdate: boolean } | null>(null)
  const [application, setApplication] = useState<ExistingApplication | null>(null)
  // Public stats + showcase only feed the client landing.
  const landing = useLandingData(vendor?.variant === 'client')

  // ── Mount: auth gate (unchanged) + role/subscription → variant ───────────
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.push('/auth/login?redirect=/become-a-vendor')
      return
    }
    let alive = true
    loadVendorState().then(s => { if (alive) setVendor(s) })
    return () => { alive = false }
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

  const handleSuccess = useCallback((wasUpdate: boolean) => {
    setSuccess({ wasUpdate })
    window.scrollTo({ top: 0 })
  }, [])

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!mounted || !vendor) {
    return (
      <>
        <style>{FONTS}</style>
        <Navbar />
        <PageSkeleton label={tc('loading')} />
      </>
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

  // ── Approved seller: never the application form ──────────────────────────
  if (vendor.variant === 'seller') {
    return (
      <>
        <style>{FONTS}</style>
        <Navbar />
        <main className="vl">
          <SellerView state={vendor} plans={livePlans} />
        </main>
      </>
    )
  }

  const pending = vendor.variant === 'pending'

  // The application section: the form for clients, the status banner (+ view / edit) for applicants.
  const applySection = (
    <section ref={formRef} id="apply" className="vl-section vl-apply" aria-labelledby="vl-apply-title">
      <TunisianPattern color="#198f41" className="vl-pattern" />
      <div className="vl-container vl-apply__inner">
        <SectionHeading id="vl-apply-title" tone="green"
          eyebrow={pending ? t('pending.applyEyebrow') : t('formEyebrow')}
          line1={pending ? t('pending.applyTitle1') : tl('form.title1')}
          line2={pending ? t('pending.applyTitle2') : tl('form.title2')}
          lead={pending ? undefined : t('formSubtitle')} />
        <ApplicationForm onSuccess={handleSuccess} onApplication={setApplication} scrollToForm={scrollToForm} />
      </div>
    </section>
  )

  return (
    <>
      <style>{FONTS}</style>
      <Navbar />

      {lockedModal && (
        <LockedPlanModal planKey={lockedModal} onClose={() => setLockedModal(null)} onScrollToForm={handleGreenClick} />
      )}

      {pending ? (
        <main className="vl">
          <PendingHero ref={heroRef} submittedAt={application?.created_at ?? null} shopName={application?.business_name} onView={scrollToForm} />
          <PendingNext />
          {applySection}
          <FaqSection plans={livePlans} />
        </main>
      ) : (
        <>
          <main className="vl">
            <VendorHero ref={heroRef} onPrimary={scrollToForm} onPlans={scrollToPlans} hasApplication={application !== null} />
            <StatsStrip stats={landing.data?.stats ?? null} failed={landing.failed} />
            <WhySection />
            <HowItWorks />
            <PlansSection ref={plansRef} plans={livePlans} onSelect={selectPlan} />
            <SellerShowcase sellers={landing.data?.sellers} />
            {applySection}
            <FaqSection plans={livePlans} />
            <FinalCta onClick={scrollToForm} />
          </main>
          <StickyMobileCta heroRef={heroRef} hideRef={formRef} label={tl('sticky')} icon="🏪" onClick={scrollToForm} />
        </>
      )}
    </>
  )
}
