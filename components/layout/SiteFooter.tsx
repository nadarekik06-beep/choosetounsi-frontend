'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LanguageInlineSelect } from '@/components/i18n/LanguageSwitcher'

// Pages with their own chrome (dashboards, printable documents, auth callbacks) skip the footer.
const HIDDEN_PREFIXES = ['/seller', '/invoice', '/settlement', '/auth/google', '/onboarding']

export default function SiteFooter() {
  const t = useTranslations('footer')
  const pathname = usePathname() ?? '/'
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null

  const openSupport = () => window.dispatchEvent(new Event('open-support-chat'))

  return (
    <footer className="sf" data-print-hide>
      <div className="sf-in">
        <div className="sf-brand">
          <Link href="/" className="sf-logo">
            <img src="/images/logo.png" alt="" width={34} height={34} />
            <span>Choose<b>Tounsi</b></span>
          </Link>
          <p className="sf-tag">{t('tagline')}</p>
        </div>

        <nav className="sf-col" aria-label={t('shop')}>
          <p className="sf-h">{t('shop')}</p>
          <Link href="/shop">{t('allProducts')}</Link>
          <Link href="/deals">{t('deals')}</Link>
          <Link href="/brand">{t('brand')}</Link>
          <Link href="/discover">{t('discover')}</Link>
        </nav>

        <nav className="sf-col" aria-label={t('help')}>
          <p className="sf-h">{t('help')}</p>
          <Link href="/orders">{t('myOrders')}</Link>
          <Link href="/complaints">{t('complaints')}</Link>
          <button type="button" onClick={openSupport}>{t('contact')}</button>
        </nav>

        <nav className="sf-col" aria-label={t('sell')}>
          <p className="sf-h">{t('sell')}</p>
          <Link href="/become-a-vendor">{t('becomeVendor')}</Link>
          <Link href="/seller">{t('sellerSpace')}</Link>
        </nav>

        <div className="sf-col">
          <p className="sf-h">{t('language')}</p>
          <LanguageInlineSelect tone="dark" />
        </div>
      </div>

      <div className="sf-bottom">
        <span>{t('rights', { year: new Date().getFullYear() })}</span>
        <span>{t('madeIn')}</span>
      </div>

      <style>{`
        .sf{background:#09090b;color:rgba(255,255,255,.72);margin-top:48px;border-top:3px solid #db142e}
        .sf-in{max-width:1400px;margin:0 auto;padding:40px 24px 28px;display:grid;grid-template-columns:1.6fr repeat(3,1fr) 1.4fr;gap:28px}
        .sf-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-size:18px;font-weight:900}
        .sf-logo img{background:#fff;border-radius:8px;padding:2px;box-shadow:0 0 0 1.5px #198f41}
        .sf-logo b{color:#22c55e;font-weight:900}
        .sf-tag{margin:12px 0 0;font-size:13px;line-height:1.6;max-width:300px}
        .sf-col{display:flex;flex-direction:column;align-items:flex-start;gap:9px}
        .sf-h{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff}
        .sf-col a,.sf-col>button{font-size:13px;color:rgba(255,255,255,.72);text-decoration:none;background:none;border:none;padding:0;cursor:pointer;font-family:inherit;text-align:start}
        .sf-col a:hover,.sf-col>button:hover{color:#fff}
        .sf-bottom{max-width:1400px;margin:0 auto;padding:16px 24px 24px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.45)}
        @media(max-width:900px){.sf-in{grid-template-columns:1fr 1fr;gap:24px}.sf-brand{grid-column:1/-1}.sf-in>.sf-col:last-child{grid-column:1/-1}}
        @media print{.sf{display:none}}
      `}</style>
    </footer>
  )
}
