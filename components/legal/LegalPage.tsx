import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import Navbar from '@/app/components/layout/Navbar'
import TunisianPattern from '@/app/components/home/illustrations/TunisianPattern'
import type { LegalDoc, MadeBy } from '@/lib/legal/types'
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

/** Renders **bold** markers as <strong>. */
function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

function TocList({ doc }: { doc: LegalDoc }) {
  return (
    <ol>
      {doc.sections.map(s => (
        <li key={s.id}><a href={`#${s.id}`}>{s.heading}</a></li>
      ))}
    </ol>
  )
}

/** A legal document: table of contents + numbered sections + "made by" block. */
export async function LegalDocument({ doc, madeBy, current }: { doc: LegalDoc; madeBy: MadeBy; current: 'privacy' | 'terms' }) {
  const t = await getTranslations('legal')
  return (
    <InfoShell current={current} eyebrow={t('eyebrow')} title={doc.title} intro={doc.intro} meta={doc.updated}>
      <div className="lg-doc">
        <aside className="lg-toc">
          {/* Phones: collapsed by default so it does not fill the screen. Desktop: always open. */}
          <details className="lg-toc__mobile">
            <summary>{doc.tocTitle}</summary>
            <TocList doc={doc} />
          </details>
          <nav className="lg-toc__desktop" aria-label={doc.tocTitle}>
            <p className="lg-toc__title">{doc.tocTitle}</p>
            <TocList doc={doc} />
          </nav>
        </aside>
        <div>
          <article className="lg-article">
            {doc.sections.map(s => (
              <section key={s.id} id={s.id} className="lg-section">
                <h2>{s.heading}</h2>
                {s.body?.map((p, i) => <p key={`b${i}`}>{rich(p)}</p>)}
                {s.items && (
                  <ul>
                    {s.items.map((it, i) => <li key={i}>{rich(it)}</li>)}
                  </ul>
                )}
                {s.steps && (
                  <ol className="lg-steps">
                    {s.steps.map((it, i) => <li key={i}>{rich(it)}</li>)}
                  </ol>
                )}
                {s.after?.map((p, i) => <p key={`a${i}`}>{rich(p)}</p>)}
                {s.note && <p className="lg-callout">{rich(s.note)}</p>}
              </section>
            ))}
          </article>
          <aside className="lg-madeby" aria-label={madeBy.title}>
            <p className="lg-madeby__title"><span aria-hidden="true">❤️</span> {madeBy.title}</p>
            <p className="lg-madeby__body">{madeBy.body}</p>
          </aside>
        </div>
      </div>
    </InfoShell>
  )
}
