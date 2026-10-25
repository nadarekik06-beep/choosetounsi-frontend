'use client'

// Mega-menu body for a gendered category (Mode & Vêtements): a Femme | Homme switch,
// then that gender's own columns. Same look as the regular mega-menu columns (Navbar.tsx).
// Columns and items come from the admin-managed gender menu (GET /categories/mega-menu).

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { GENDERS, genderHref, localName, type Gender, type GenderMenuCategory } from '@/lib/gender'

export default function GenderMegaBody({ cat, catName, onClose }: {
  cat: GenderMenuCategory; catName: string; onClose: () => void
}) {
  const t = useTranslations('mega')
  const locale = useLocale()
  const [gender, setGender] = useState<Gender>('women')
  const cols = cat.genders[gender] ?? []
  const allHref = genderHref(cat.slug, gender)
  const itemLabel = (slug: string, fallback: string) => (t.has(`items.${slug}`) ? t(`items.${slug}`) : fallback)

  return (
    <>
      <style>{`.mgs{display:inline-flex;gap:4px;padding:4px;background:#f3f4f6;border-radius:999px;margin-bottom:20px}
.mgs-b{border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:#6b7280;padding:7px 22px;border-radius:999px;transition:all .15s}
.mgs-b:hover{color:#dc2626}
.mgs-b.on{background:#fff;color:#dc2626;box-shadow:0 1px 4px rgba(0,0,0,.08)}`}</style>

      <div className="mgs" role="tablist" aria-label={t('genderSwitch')}>
        {GENDERS.map(g => (
          <button key={g} type="button" role="tab" aria-selected={gender === g}
            className={`mgs-b${gender === g ? ' on' : ''}`}
            onMouseEnter={() => setGender(g)} onFocus={() => setGender(g)} onClick={() => setGender(g)}>
            {t(g)}
          </button>
        ))}
      </div>

      {cols.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: '#9ca3af', minHeight: 160 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{t('explore', { name: catName })}</p>
          <Link href={allHref} onClick={onClose} style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', textDecoration: 'none', padding: '8px 20px', border: '1.5px solid #dc2626', borderRadius: 999 }}>{t('viewAllProducts')}</Link>
        </div>
      ) : (
        <>
          <div className="mm-grid" role="tabpanel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '24px 20px' }}>
            {cols.map(g => (
              <div key={g.key}>
                <Link href={allHref} onClick={onClose} style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#dc2626', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #fee2e2' }}>{localName(g, locale)}</Link>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {g.items.map(it => (
                    <li key={it.id}><Link href={genderHref(it.category_slug, gender, it.slug)} onClick={onClose} className="msub" style={{ fontSize: 13, color: '#4b5563', textDecoration: 'none', fontWeight: 400, display: 'block', lineHeight: 1.5, transition: 'color 0.12s' }}>{itemLabel(it.slug, localName(it, locale))}</Link></li>
                  ))}
                </ul>
                <Link href={allHref} onClick={onClose} className="mmore" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#9ca3af', textDecoration: 'none', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px dashed #d1d5db', paddingBottom: 1, transition: 'color 0.12s' }}>
                  {t('viewMore')} <svg className="rtl-flip" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <Link href={allHref} onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'none', padding: '7px 16px', background: '#fff5f5', borderRadius: 999, border: '1.5px solid #fecaca' }}>
              {t('viewAllGender', { name: catName, gender: t(gender) })}
            </Link>
          </div>
        </>
      )}
    </>
  )
}
