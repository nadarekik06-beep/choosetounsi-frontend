'use client'

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Globe, X } from 'lucide-react'
import { localeLabels, locales, type Locale } from '@/i18n/config'
import { installLocaleFetch, persistLocale } from '@/lib/i18n/clientLocale'

// Installed at module load so even the very first effects send Accept-Language.
installLocaleFetch()

interface LanguageContextValue {
  locale: Locale
  switching: boolean
  setLocale: (locale: Locale) => void
  openModal: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [switching, startTransition] = useTransition()

  const setLocale = useCallback((next: Locale) => {
    setOpen(false)
    if (next === locale) return
    // Cookie + <html lang dir> flip immediately; the refresh re-renders server
    // components with the new messages while keeping the URL, cart and session.
    persistLocale(next)
    startTransition(() => router.refresh())
  }, [locale, router])

  const openModal = useCallback(() => setOpen(true), [])

  return (
    <LanguageContext.Provider value={{ locale, switching, setLocale, openModal }}>
      {children}
      {open && <LanguageModal current={locale} onSelect={setLocale} onClose={() => setOpen(false)} />}
      {switching && <div className="ls-progress" aria-hidden />}
      <style>{`
        .ls-progress{position:fixed;top:0;inset-inline:0;height:3px;z-index:100000;background:linear-gradient(90deg,#db142e,#198f41);animation:lsProg 1s ease-in-out infinite;transform-origin:0 50%}
        @keyframes lsProg{0%{transform:scaleX(.1)}50%{transform:scaleX(.7)}100%{transform:scaleX(1);opacity:.4}}
      `}</style>
    </LanguageContext.Provider>
  )
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */

const CARD_ACCENT: Record<Locale, string> = { fr: '#db142e', ar: '#198f41', en: '#0f172a' }
// Each card speaks its own language, whatever the current UI language is.
const NATIVE_HINT: Record<Locale, string> = {
  fr: 'Continuer en français',
  ar: 'المتابعة باللغة العربية',
  en: 'Continue in English',
}

function LanguageModal({ current, onSelect, onClose }: { current: Locale; onSelect: (l: Locale) => void; onClose: () => void }) {
  const t = useTranslations('language')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [onClose])

  return (
    <div className="lm-back" onClick={onClose} role="presentation">
      <div className="lm-box" role="dialog" aria-modal="true" aria-labelledby="lm-title" onClick={e => e.stopPropagation()}>
        <div className="lm-head">
          <span className="lm-globe"><Globe size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="lm-title" className="lm-title">{t('modalTitle')}</h2>
            <p className="lm-sub">{t('modalSubtitle')}</p>
          </div>
          <button className="lm-close" onClick={onClose} aria-label={t('close')}><X size={18} /></button>
        </div>

        <div className="lm-grid">
          {locales.map(l => {
            const active = l === current
            return (
              <button
                key={l}
                lang={l}
                dir={l === 'ar' ? 'rtl' : 'ltr'}
                onClick={() => onSelect(l)}
                className={`lm-card${active ? ' on' : ''}`}
                style={{ ['--acc' as string]: CARD_ACCENT[l] }}
                aria-pressed={active}
              >
                <span className="lm-code">{localeLabels[l].short}</span>
                <span className="lm-native" style={l === 'ar' ? { fontFamily: 'var(--font-cairo), system-ui, sans-serif' } : undefined}>
                  {localeLabels[l].native}
                </span>
                <span className="lm-desc">{NATIVE_HINT[l]}</span>
                {active && <span className="lm-check"><Check size={13} strokeWidth={3} /></span>}
              </button>
            )
          })}
        </div>

        <p className="lm-foot">{t('remembered')}</p>
      </div>

      <style>{`
        .lm-back{position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;animation:lmFade .18s ease}
        .lm-box{width:100%;max-width:560px;background:#fff;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.28);overflow:hidden;animation:lmUp .24s cubic-bezier(.34,1.3,.64,1)}
        .lm-head{display:flex;align-items:center;gap:12px;padding:20px 22px 16px;border-bottom:1px solid #f1f5f9}
        .lm-globe{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#db142e,#9b0f1f);color:#fff;flex-shrink:0;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #198f41}
        .lm-title{margin:0;font-size:17px;font-weight:900;color:#0f172a}
        .lm-sub{margin:2px 0 0;font-size:12.5px;color:#64748b}
        .lm-close{width:36px;height:36px;border-radius:50%;border:none;background:#f1f5f9;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .lm-close:hover{background:#fee2e2;color:#db142e}
        .lm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 22px}
        .lm-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:16px 14px;border-radius:14px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;font-family:inherit;text-align:start;transition:border-color .15s,box-shadow .15s,transform .15s}
        .lm-card:hover{border-color:#198f41;box-shadow:0 8px 24px rgba(25,143,65,.14);transform:translateY(-2px)}
        .lm-card.on{border-color:#db142e;background:#fff5f5;box-shadow:0 8px 24px rgba(219,20,46,.14)}
        .lm-code{font-size:11px;font-weight:900;letter-spacing:.08em;color:#fff;background:var(--acc);border-radius:6px;padding:2px 7px}
        .lm-native{font-size:16px;font-weight:800;color:#0f172a}
        .lm-desc{font-size:11.5px;color:#64748b;line-height:1.35}
        .lm-check{position:absolute;top:10px;inset-inline-end:10px;width:22px;height:22px;border-radius:50%;background:#db142e;color:#fff;display:flex;align-items:center;justify-content:center}
        .lm-foot{margin:0;padding:12px 22px 18px;font-size:11.5px;color:#94a3b8;text-align:center}
        @keyframes lmFade{from{opacity:0}to{opacity:1}}
        @keyframes lmUp{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @media(max-width:520px){.lm-grid{grid-template-columns:1fr}.lm-card{flex-direction:row;align-items:center;flex-wrap:wrap}.lm-desc{flex-basis:100%}}
      `}</style>
    </div>
  )
}

/* ─── Triggers ──────────────────────────────────────────────────────────── */

/** Top-bar link: "🌐 Changer de langue (FR)". */
export function LanguageLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const t = useTranslations('language')
  const { locale, openModal } = useLanguage()
  return (
    <button type="button" onClick={openModal} className={className} style={style} aria-haspopup="dialog">
      <Globe size={13} />
      {t('change', { code: localeLabels[locale].short })}
    </button>
  )
}

/** Inline segmented selector for the mobile menu and footer. */
export function LanguageInlineSelect({ tone = 'light', onChanged }: { tone?: 'light' | 'dark'; onChanged?: () => void }) {
  const t = useTranslations('language')
  const { locale, setLocale } = useLanguage()
  const dark = tone === 'dark'
  return (
    <div role="group" aria-label={t('label')} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Globe size={14} color={dark ? 'rgba(255,255,255,0.6)' : '#64748b'} />
      {locales.map(l => {
        const active = l === locale
        return (
          <button
            key={l}
            type="button"
            lang={l}
            onClick={() => { setLocale(l); onChanged?.() }}
            aria-pressed={active}
            style={{
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: active ? 800 : 600,
              border: `1.5px solid ${active ? '#db142e' : dark ? 'rgba(255,255,255,0.18)' : '#e5e7eb'}`,
              background: active ? '#db142e' : 'transparent',
              color: active ? '#fff' : dark ? 'rgba(255,255,255,0.8)' : '#374151',
            }}
          >
            {localeLabels[l].native}
          </button>
        )
      })}
    </div>
  )
}
