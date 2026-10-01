'use client'

/**
 * Homepage "two doors" section: buyers go discover (red), sellers open a shop (green).
 * - Loops are paused while the section is off-screen (.is-live) and frozen under
 *   prefers-reduced-motion; entrance reveal / count-up / check drawing run once per
 *   panel (.dcta-reveal.is-in).
 * - The seller CTA always leads to /become-a-vendor (that page handles login itself).
 */

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useInView } from '@/app/hooks/useInView'
import CountUp from './CountUp'
import AnimatedDiscoverBag from './illustrations/AnimatedDiscoverBag'
import AnimatedStore from './illustrations/AnimatedStore'
import AnimatedPepper, { PEPPER_CSS } from './illustrations/AnimatedPepper'
import TunisianPattern from './illustrations/TunisianPattern'

function TunisiaFlag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 30 20" aria-hidden="true" focusable="false" className="dcta-flag">
      <rect width="30" height="20" rx="3" fill="#e70013" />
      <circle cx="15" cy="10" r="6" fill="#fff" />
      <circle cx="15.6" cy="10" r="4.4" fill="#e70013" />
      <circle cx="16.8" cy="10" r="3.6" fill="#fff" />
      <path d="M15.6 10 l3.9 -1.3 -2.4 3.3 v-4 l2.4 3.3z" fill="#e70013" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <span className="dcta-arrow" aria-hidden="true">
      <svg className="rtl-flip" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" focusable="false">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </span>
  )
}

export default function DualCTASection() {
  const t = useTranslations('homeCta')
  const { ref, inView, seen } = useInView<HTMLElement>({ threshold: 0.05 })
  // Each door reveals on its own: on mobile they're stacked, so the seller one enters later.
  const { ref: shopRef, seen: shopSeen } = useInView<HTMLDivElement>({ threshold: 0.2 })
  const { ref: sellRef, seen: sellSeen } = useInView<HTMLDivElement>({ threshold: 0.2 })

  const perks = [t('perk1'), t('perk2'), t('perk3')]

  return (
    <section
      ref={ref}
      aria-labelledby="dcta-shop-title dcta-sell-title"
      className={`dcta${seen ? ' is-seen' : ''}${inView ? ' is-live' : ''}`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@400;500;600;700;800&display=swap');

        .dcta {
          --red: #db142e; --red-dark: #b01025;
          --green: #198f41; --green-dark: #137234;
          --ink: #111; --muted: #5f6368;
          --dir: 1;
          position: relative;
          background: #f7f7f5;
          padding: clamp(40px, 6vw, 80px) 16px;
          overflow: hidden;
        }
        [dir="rtl"] .dcta { --dir: -1; }
        .dcta-grid {
          position: relative;
          max-width: 1240px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
        }

        /* ── reveal wrapper (entrance) ── */
        .dcta-reveal {
          opacity: 0; transform: translateY(28px);
          transition: opacity .7s ease, transform .8s cubic-bezier(.2,.8,.2,1);
          min-width: 0;
        }
        .dcta-reveal--sell { transition-delay: .18s; }
        .dcta-reveal.is-in { opacity: 1; transform: none; }

        /* ── panel ── */
        .dcta-panel {
          position: relative; isolation: isolate; height: 100%;
          border-radius: 24px; overflow: hidden;
          display: flex; flex-direction: column;
          padding: 28px clamp(22px, 3.2vw, 44px) clamp(28px, 3.2vw, 44px);
          transition: transform .4s cubic-bezier(.2,.8,.2,1);
        }
        .dcta-panel::after {
          content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit;
          box-shadow: 0 30px 60px -24px var(--shadow), 0 10px 24px -12px var(--shadow);
          opacity: 0; transition: opacity .4s ease; pointer-events: none;
        }
        .dcta-panel:hover { transform: translateY(-4px); }
        .dcta-panel:hover::after { opacity: 1; }
        .dcta-panel--shop {
          --shadow: rgba(219,20,46,.28);
          background:
            radial-gradient(120% 70% at 50% 0%, rgba(219,20,46,.10) 0%, transparent 60%),
            radial-gradient(60% 50% at 100% 100%, rgba(219,20,46,.06) 0%, transparent 70%),
            #fff;
          box-shadow: 0 1px 0 rgba(17,17,17,.04), inset 0 0 0 1px rgba(17,17,17,.06);
        }
        .dcta-panel--sell {
          --shadow: rgba(25,143,65,.32);
          background:
            radial-gradient(120% 70% at 50% 0%, rgba(25,143,65,.16) 0%, transparent 60%),
            radial-gradient(60% 50% at 0% 100%, rgba(25,143,65,.10) 0%, transparent 70%),
            linear-gradient(160deg, #f3fcf6 0%, #e3f7ea 100%);
          box-shadow: inset 0 0 0 1px rgba(25,143,65,.14);
        }
        .dcta-pattern {
          position: absolute; inset: 0; width: 100%; height: 100%;
          opacity: .04; z-index: -1; pointer-events: none;
        }

        /* ── illustration stage + floating chips ── */
        .dcta-stage {
          position: relative; height: 296px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .dcta-art {
          width: 284px; height: 284px; max-width: 100%;
          transition: transform .5s cubic-bezier(.2,.8,.2,1);
        }
        .dcta-panel:hover .dcta-art { transform: scale(1.03); }
        .dcta-panel--shop:hover .adb-label { transform: scale(1.08); }
        .dcta-panel--shop:hover .adb-burst { animation: adbBurst .8s ease-out both; }
        .dcta-panel--sell:hover .ast-door,
        .dcta-panel--sell:focus-within .ast-door { transform: scaleX(.2) skewY(-6deg); }
        @media (hover: none) { .is-in .ast-door { transform: scaleX(.3) skewY(-5deg); } }

        .dcta-chip {
          position: absolute; z-index: 2;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 999px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 8px 24px -8px rgba(17,17,17,.22), inset 0 0 0 1px rgba(17,17,17,.06);
          font-family: 'Barlow', sans-serif; font-size: 12px; font-weight: 700; color: var(--ink);
          white-space: nowrap;
          animation: dctaDrift 9s ease-in-out infinite;
        }
        .dcta-chip b { font-weight: 800; }
        .dcta-chip--a { top: 8%;  inset-inline-start: 2%; }
        .dcta-chip--b { top: 44%; inset-inline-end: 0;    animation-duration: 11s; animation-delay: -3s; }
        .dcta-chip--c { bottom: 6%; inset-inline-start: 6%; animation-duration: 10s; animation-delay: -6s; }
        .dcta-chip--d { top: 6%;  inset-inline-end: 2%;   animation-duration: 10s; animation-delay: -2s; }
        .dcta-chip--e { top: 40%; inset-inline-start: 0;  animation-duration: 12s; animation-delay: -5s; }
        .dcta-star { color: #f59e0b; }
        .dcta-avatars { display: inline-flex; }
        .dcta-avatars i {
          width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff;
          margin-inline-start: -6px; display: block;
        }
        .dcta-avatars i:first-child { margin-inline-start: 0; }
        .dcta-verified {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--green); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
        }

        /* decorative chilies (kept to the stage edges, clear of chips) */
        ${PEPPER_CSS}
        .dcta-pep--1 { top: 12%; inset-inline-end: 12%; }
        .dcta-pep--2 { top: 30%; inset-inline-start: 12%; }
        .dcta-pep--3 { bottom: 20%; inset-inline-end: 8%; }
        .dcta-pep--4 { top: 22%; inset-inline-start: 6%; }
        .dcta-pep--5 { bottom: 34%; inset-inline-end: 4%; }

        /* order toast: slides in, holds, slides out — every 4s */
        .dcta-toast {
          position: absolute; z-index: 3; bottom: 4%; inset-inline-end: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px 9px 10px; border-radius: 14px;
          background: #fff;
          box-shadow: 0 14px 32px -12px rgba(17,17,17,.3), inset 0 0 0 1px rgba(17,17,17,.06);
          font-family: 'Barlow', sans-serif; text-align: start;
          animation: dctaToast 4s cubic-bezier(.2,.8,.2,1) infinite both;
        }
        [dir="rtl"] .dcta-toast { padding: 9px 10px 9px 14px; }
        .dcta-toast__icon {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
          background: #e8f7ee; display: flex; align-items: center; justify-content: center; font-size: 15px;
        }
        .dcta-toast__icon span { display: inline-block; animation: dctaRing 4s ease-in-out infinite; }
        .dcta-toast__title { font-size: 12px; font-weight: 800; color: var(--ink); line-height: 1.2; }
        .dcta-toast__sub { font-size: 11px; font-weight: 600; color: var(--muted); line-height: 1.2; }

        /* ── copy ── */
        .dcta-body { position: relative; display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .dcta-kicker {
          display: inline-flex; align-items: flex-start; gap: 8px; margin: 0; line-height: 1.5;
          font-family: 'Barlow', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: .14em; text-transform: uppercase;
        }
        .dcta-panel--shop .dcta-kicker { color: var(--red); }
        .dcta-panel--sell .dcta-kicker { color: var(--green-dark); }
        .dcta-kicker__dot { flex-shrink: 0; margin-top: 5px; width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 18%, transparent); }
        .dcta-title {
          margin: 0; font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(2.2rem, 3.6vw, 3.3rem); font-weight: 900;
          line-height: 1; letter-spacing: -.02em; color: var(--ink);
        }
        .dcta-title em { font-style: normal; display: inline-block; position: relative; }
        .dcta-panel--shop .dcta-title em { color: var(--red); }
        .dcta-panel--sell .dcta-title em { color: var(--green); }
        .dcta-title em::after {
          content: ''; position: absolute; inset-inline: 0; bottom: -5px; height: 4px; border-radius: 4px;
          background: currentColor; opacity: .9;
          transform: scaleX(0); transform-origin: var(--origin, left);
          transition: transform .8s cubic-bezier(.2,.8,.2,1) .5s;
        }
        [dir="rtl"] .dcta-title em::after { --origin: right; }
        .is-in .dcta-title em::after { transform: scaleX(1); }
        .dcta-sub {
          margin: 0; max-width: 440px;
          font-family: 'Barlow', sans-serif; font-size: .92rem; font-weight: 500; line-height: 1.65; color: var(--muted);
        }

        /* stats */
        .dcta-stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 4px 0 6px; padding: 0; list-style: none; }
        .dcta-stat {
          min-width: 104px; padding: 12px 16px; border-radius: 16px;
          background: #fff; box-shadow: inset 0 0 0 1px rgba(17,17,17,.07);
        }
        .dcta-stat__num {
          font-family: 'Barlow Condensed', sans-serif; font-size: 1.9rem; font-weight: 900;
          line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums;
          display: flex; align-items: center; height: 30px;
        }
        .dcta-stat__num em { font-style: normal; color: var(--red); }
        .dcta-stat__label {
          margin-top: 4px; font-family: 'Barlow', sans-serif; font-size: 10.5px; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase; color: #8a8f98;
        }
        .dcta-flag { display: block; border-radius: 3px; box-shadow: 0 0 0 1px rgba(17,17,17,.08); }

        /* perks: check icons draw themselves, staggered */
        .dcta-perks { display: flex; flex-direction: column; gap: 10px; margin: 2px 0 6px; padding: 0; list-style: none; }
        .dcta-perk {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Barlow', sans-serif; font-size: .9rem; font-weight: 600; color: #2f3b33;
          opacity: 0; transform: translateX(calc(var(--dir) * -14px));
          transition: opacity .5s ease, transform .6s cubic-bezier(.2,.8,.2,1);
          transition-delay: calc(.35s + var(--i) * .15s);
        }
        .is-in .dcta-perk { opacity: 1; transform: none; }
        .dcta-perk__icon {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: var(--green); color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 10px -3px rgba(25,143,65,.6);
        }
        .dcta-perk__icon polyline {
          stroke-dasharray: 1; stroke-dashoffset: 1;
          transition: stroke-dashoffset .5s ease;
          transition-delay: calc(.55s + var(--i) * .15s);
        }
        .is-in .dcta-perk__icon polyline { stroke-dashoffset: 0; }

        /* buttons */
        .dcta-actions { margin-top: auto; padding-top: 8px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
        .dcta-btn {
          position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 50px; padding: 0 30px; border: 0; border-radius: 999px; cursor: pointer;
          font-family: 'Barlow', sans-serif; font-size: .8rem; font-weight: 800;
          letter-spacing: .1em; text-transform: uppercase; color: #fff; text-decoration: none;
          transition: transform .25s ease;
        }
        .dcta-btn:hover { transform: translateY(-2px); }
        .dcta-btn:active { transform: translateY(0) scale(.98); }
        .dcta-btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
        .dcta-btn--shop { background: var(--red); overflow: hidden; box-shadow: 0 10px 26px -8px rgba(219,20,46,.6); }
        .dcta-btn--shop::after {
          content: ''; position: absolute; top: -50%; bottom: -50%; left: 0; width: 34%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
          transform: translateX(-160%) skewX(-20deg);
          transition: transform .8s ease;
        }
        .dcta-btn--shop:hover::after { transform: translateX(420%) skewX(-20deg); }
        .dcta-arrow { display: inline-flex; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
        .dcta-btn:hover .dcta-arrow { transform: translateX(calc(var(--dir) * 5px)); }
        .dcta-btn--sell { background: var(--green); box-shadow: 0 10px 26px -8px rgba(25,143,65,.6); }
        .dcta-btn--sell::before, .dcta-btn--sell::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          box-shadow: 0 0 0 2px rgba(25,143,65,.5);
          animation: dctaPulse 2.6s ease-out infinite both;
        }
        .dcta-btn--sell::after { animation-delay: 1.3s; }
        .dcta-btn__emoji { font-size: 1rem; line-height: 1; }
        .dcta-trust {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px;
          font-family: 'Barlow', sans-serif; font-size: 11px; font-weight: 600; color: #6b7280;
        }
        .dcta-trust__dot { width: 3px; height: 3px; border-radius: 50%; background: #9ca3af; }

        /* ── "OU" badge between the doors ── */
        .dcta-or {
          position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(219,20,46,.25) 30%, rgba(25,143,65,.25) 70%, transparent);
          pointer-events: none; z-index: 2;
          opacity: 0; transition: opacity .6s ease .4s;
        }
        .dcta.is-seen .dcta-or { opacity: 1; }
        .dcta-or span {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 46px; height: 46px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #fff; color: var(--ink);
          box-shadow: 0 10px 24px -8px rgba(17,17,17,.25), inset 0 0 0 1px rgba(17,17,17,.08);
          font-family: 'Barlow Condensed', sans-serif; font-size: .95rem; font-weight: 900;
          text-transform: uppercase; letter-spacing: .04em;
        }

        /* ── keyframes (transform/opacity only) ── */
        @keyframes dctaDrift {
          0%,100% { transform: translate(0, 0); }
          25% { transform: translate(5px, -7px); }
          50% { transform: translate(0, -11px); }
          75% { transform: translate(-5px, -5px); }
        }
        @keyframes dctaToast {
          0%   { opacity: 0; transform: translateX(calc(var(--dir) * 28px)) scale(.96); }
          12%, 72% { opacity: 1; transform: translateX(0) scale(1); }
          86%, 100% { opacity: 0; transform: translateX(calc(var(--dir) * 28px)) scale(.96); }
        }
        @keyframes dctaRing {
          0%,10%,40%,100% { transform: rotate(0); }
          16% { transform: rotate(16deg); } 22% { transform: rotate(-14deg); }
          28% { transform: rotate(10deg); } 34% { transform: rotate(-6deg); }
        }
        @keyframes dctaPulse {
          0% { opacity: .9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05, 1.35); }
        }

        /* loops run only while visible */
        .dcta:not(.is-live) *, .dcta:not(.is-live) *::before, .dcta:not(.is-live) *::after {
          animation-play-state: paused !important;
        }

        /* ── responsive ── */
        @media (max-width: 1100px) {
          .dcta-chip--b { top: 50%; }
        }
        @media (max-width: 899px) {
          .dcta-grid { grid-template-columns: 1fr; gap: 24px; max-width: 680px; }
          .dcta-or { display: none; }
        }
        @media (min-width: 640px) and (max-width: 899px) {
          .dcta-panel { flex-direction: row; align-items: center; gap: 12px; padding: 28px; }
          .dcta-stage { flex: 0 0 44%; height: 300px; margin: 0; }
          .dcta-art { width: 250px; height: 250px; }
          .dcta-chip { font-size: 11px; padding: 6px 10px; }
        }
        @media (max-width: 639px) {
          .dcta { padding: 36px 16px 44px; }
          .dcta-panel { padding: 16px 20px 26px; border-radius: 22px; }
          .dcta-stage { height: 236px; margin-bottom: 4px; }
          .dcta-art { width: 210px; height: 210px; }
          .dcta-chip { font-size: 10.5px; padding: 5px 9px; gap: 5px; }
          .dcta-chip--b { top: auto; bottom: 6%; inset-inline-start: auto; inset-inline-end: 2%; }
          .dcta-chip--c { bottom: 6%; inset-inline-start: 2%; }
          .dcta-chip--e { display: none; }
          .dcta-pep--sm { display: none; }
          .dcta-pep--1 { top: 8%; inset-inline-end: 6%; }
          .dcta-pep--4 { top: 30%; inset-inline-start: 2%; }
          .dcta-toast { bottom: 2%; padding: 7px 11px 7px 8px; }
          .dcta-toast__icon { width: 26px; height: 26px; }
          .dcta-stats { gap: 8px; }
          .dcta-stat { flex: 1 1 0; min-width: 0; padding: 10px 12px; }
          .dcta-stat__num { font-size: 1.6rem; }
          .dcta-actions { align-items: stretch; }
          .dcta-btn { width: 100%; }
          .dcta-trust { justify-content: center; }
        }
        @media (max-width: 380px) {
          .dcta-chip--a { top: 3%; }
          .dcta-chip--d { top: 3%; }
          .dcta-avatars { display: none; }
        }

        /* ── reduced motion: static illustrations, content shown immediately ── */
        @media (prefers-reduced-motion: reduce) {
          .dcta *, .dcta *::before, .dcta *::after { animation: none !important; transition: none !important; }
          .dcta-reveal, .dcta-perk { opacity: 1; transform: none; }
          .dcta-perk__icon polyline { stroke-dashoffset: 0; }
          .dcta-title em::after { transform: scaleX(1); }
          .dcta-or { opacity: 1; }
          .dcta-panel:hover, .dcta-panel:hover .dcta-art, .dcta-btn:hover, .dcta-btn:hover .dcta-arrow,
          .dcta-panel--shop:hover .adb-label { transform: none; }
          .dcta-btn--sell::before, .dcta-btn--sell::after { display: none; }
        }
      `}</style>

      <div className="dcta-grid">
        {/* ── Buyer door ── */}
        <div ref={shopRef} className={`dcta-reveal dcta-reveal--shop${shopSeen ? ' is-in' : ''}`}>
          <article className="dcta-panel dcta-panel--shop" aria-labelledby="dcta-shop-title">
            <TunisianPattern color="#db142e" />

            <div className="dcta-stage">
              <AnimatedDiscoverBag className="dcta-art" />
              <AnimatedPepper color="red" size={34} rotate={24} delay={-1} className="dcta-pep--1" />
              <AnimatedPepper color="green" size={18} rotate={-30} delay={-3.2} className="dcta-pep--2 dcta-pep--sm" />
              <AnimatedPepper color="green" size={24} rotate={60} delay={-4.5} className="dcta-pep--3 dcta-pep--sm" />
              <span className="dcta-chip dcta-chip--a"><span className="dcta-star" aria-hidden="true">★</span><b className="ltr-iso">{t('badgeRating')}</b></span>
              <span className="dcta-chip dcta-chip--b"><span aria-hidden="true">🚚</span>{t('badgeDelivery')}</span>
              <span className="dcta-chip dcta-chip--c"><TunisiaFlag size={12} />{t('badgeLocal')}</span>
            </div>

            <div className="dcta-body">
              <p className="dcta-kicker"><span className="dcta-kicker__dot" aria-hidden="true" />{t('exploreTag')}</p>
              <h2 id="dcta-shop-title" className="dcta-title">
                {t('shopTitle1')}<br /><em>{t('shopTitle2')}</em>
              </h2>
              <p className="dcta-sub">{t('shopSubtitle')}</p>

              <ul className="dcta-stats">
                <li className="dcta-stat">
                  <div className="dcta-stat__num"><CountUp end={500} start={shopSeen} suffix="+" /></div>
                  <div className="dcta-stat__label">{t('statProducts')}</div>
                </li>
                <li className="dcta-stat">
                  <div className="dcta-stat__num"><CountUp end={50} start={shopSeen} suffix="+" duration={1300} /></div>
                  <div className="dcta-stat__label">{t('statBrands')}</div>
                </li>
                <li className="dcta-stat">
                  <div className="dcta-stat__num"><TunisiaFlag size={20} /></div>
                  <div className="dcta-stat__label">{t('statLocal')}</div>
                </li>
              </ul>

              <div className="dcta-actions">
                <Link href="/discover" className="dcta-btn dcta-btn--shop">
                  {t('exploreNow')}
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </article>
        </div>

        {/* ── Seller door ── */}
        <div ref={sellRef} className={`dcta-reveal dcta-reveal--sell${sellSeen ? ' is-in' : ''}`}>
          <article className="dcta-panel dcta-panel--sell" aria-labelledby="dcta-sell-title">
            <TunisianPattern color="#198f41" />

            <div className="dcta-stage">
              <AnimatedStore className="dcta-art" signLabel={t('storeSign')} openLabel={t('storeOpen')} />
              <AnimatedPepper color="red" size={30} rotate={-20} delay={-2.2} className="dcta-pep--4" />
              <AnimatedPepper color="green" size={16} rotate={40} delay={-5} className="dcta-pep--5 dcta-pep--sm" />
              <span className="dcta-chip dcta-chip--d">
                <span className="dcta-avatars" aria-hidden="true">
                  <i style={{ background: '#db142e' }} /><i style={{ background: '#f59e0b' }} /><i style={{ background: '#198f41' }} />
                </span>
                <b>{t('chipSellers')}</b>
              </span>
              <span className="dcta-chip dcta-chip--e">
                <span className="dcta-verified" aria-hidden="true"><CheckIcon /></span>{t('chipVerified')}
              </span>
              <div className="dcta-toast" aria-hidden="true">
                <span className="dcta-toast__icon"><span>🔔</span></span>
                <span>
                  <span className="dcta-toast__title" style={{ display: 'block' }}>{t('chipOrder')}</span>
                  <span className="dcta-toast__sub" style={{ display: 'block' }}>{t('chipOrderSub')}</span>
                </span>
              </div>
            </div>

            <div className="dcta-body">
              <p className="dcta-kicker"><span className="dcta-kicker__dot" aria-hidden="true" />{t('sellTag')}</p>
              <h2 id="dcta-sell-title" className="dcta-title">
                {t('sellTitle1')}<br /><em>{t('sellTitle2')}</em>
              </h2>
              <p className="dcta-sub">{t('sellSubtitle')}</p>

              <ul className="dcta-perks">
                {perks.map((perk, i) => (
                  <li key={perk} className="dcta-perk" style={{ '--i': i } as React.CSSProperties}>
                    <span className="dcta-perk__icon"><CheckIcon /></span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="dcta-actions">
                <Link href="/become-a-vendor" className="dcta-btn dcta-btn--sell">
                  <span className="dcta-btn__emoji" aria-hidden="true">🏪</span>
                  {t('becomeSeller')}
                  <ArrowIcon />
                </Link>
                <div className="dcta-trust">
                  <span>{t('trust1')}</span>
                  <span className="dcta-trust__dot" aria-hidden="true" />
                  <span>{t('trust2')}</span>
                  <span className="dcta-trust__dot" aria-hidden="true" />
                  <span>{t('trust3')}</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="dcta-or" aria-hidden="true"><span>{t('orLabel')}</span></div>
      </div>
    </section>
  )
}
