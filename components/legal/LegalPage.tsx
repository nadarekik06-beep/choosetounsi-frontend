import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import Navbar from '@/app/components/layout/Navbar'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { LegalDoc } from '@/lib/legal/types'
import './legal.css'

type Page = 'privacy' | 'terms' | 'contact'

/**
 * Shared shell of the information pages (/privacy, /terms, /contact): hero
 * band, then the content; legal documents get a table of contents.
 * Server component: the long texts never reach the client bundle.
 */
export function InfoShell({ current, eyebrow, title, intro, meta, children }: {
  current: Page
  eyebrow: string
  title: string
  intro?: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="lg">
        <header className="lg-hero">
          <TunisianPattern color="#db142e" className="lg-pattern" />
          <div className="lg-wrap">
            <p className="lg-eyebrow">{eyebrow}</p>
            <h1 className="lg-title">{title}</h1>
            {intro && <p className="lg-intro">{intro}</p>}
            {meta && <p className="lg-meta">{meta}</p>}
          </div>
        </header>
        <div className="lg-wrap">{children}</div>
        <RelatedPages current={current} />
      </main>
    </>
  )
}

async function RelatedPages({ current }: { current: Page }) {
  const t = await getTranslations('legal')
  const pages: { key: Page; href: string }[] = [
    { key: 'privacy', href: '/privacy' },
    { key: 'terms', href: '/terms' },
    { key: 'contact', href: '/contact' },
  ]
  return (
    <nav className="lg-wrap lg-related" aria-label={t('related')}>
      {pages.filter(p => p.key !== current).map(p => (
        <Link key={p.key} href={p.href} className="lg-related__card">
          <span>{t(`${p.key}.title`)}</span>
          <span aria-hidden="true" className="lg-arrow">→</span>
        </Link>
      ))}
    </nav>
  )
}

/** A legal document: table of contents + numbered sections. */
export async function LegalDocument({ doc, current }: { doc: LegalDoc; current: 'privacy' | 'terms' }) {
  const t = await getTranslations('legal')
  return (
    <InfoShell current={current} eyebrow={t('eyebrow')} title={doc.title} intro={doc.intro} meta={doc.updated}>
      <div className="lg-doc">
        <aside className="lg-toc">
          <details open>
            <summary>{doc.tocTitle}</summary>
            <ol>
              {doc.sections.map(s => (
                <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>
              ))}
            </ol>
          </details>
        </aside>
        <article className="lg-article">
          {doc.sections.map(s => (
            <section key={s.id} id={s.id} className="lg-section">
              <h2>{s.heading}</h2>
              {s.body?.map((p, i) => <p key={`b${i}`}>{p}</p>)}
              {s.items && (
                <ul>
                  {s.items.map((it, i) => <li key={i}>{it}</li>)}
                </ul>
              )}
              {s.after?.map((p, i) => <p key={`a${i}`}>{p}</p>)}
            </section>
          ))}
        </article>
      </div>
    </InfoShell>
  )
}
