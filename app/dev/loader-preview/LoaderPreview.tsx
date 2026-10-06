'use client'

import { useState } from 'react'
import BrandLoader, { type BrandLoaderSize } from '@/components/brand/BrandLoader'

const SIZES: BrandLoaderSize[] = ['sm', 'md', 'lg']

function Panel({ dark, calm }: { dark: boolean; calm: boolean }) {
  const theme = dark ? 'dark' : 'light'
  const fg = dark ? '#f5f5f4' : '#111'
  return (
    <section style={{ background: dark ? '#0D1117' : '#fff', color: fg, borderRadius: 20, padding: 24, border: '1px solid rgba(127,127,127,.18)' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 15 }}>{dark ? 'Dark' : 'Light'}{calm ? ' · reduced motion' : ''}</h2>
      <p style={{ margin: '0 0 16px', fontSize: 12, opacity: .6 }}>section · sm / md / lg</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', alignItems: 'end' }}>
        {SIZES.map(s => <BrandLoader key={s} variant="section" size={s} theme={theme} calm={calm} label={s === 'lg' ? 'Loading products…' : undefined} />)}
      </div>
      <p style={{ margin: '20px 0 10px', fontSize: 12, opacity: .6 }}>inline · sm / md / lg, and inside buttons</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', color: dark ? '#f87171' : '#db142e' }}>
        {SIZES.map(s => <BrandLoader key={s} variant="inline" size={s} calm={calm} />)}
        <button type="button" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '10px 18px', borderRadius: 12, border: 0, background: '#db142e', color: '#fff', fontWeight: 700 }}>
          <BrandLoader variant="inline" size="sm" calm={calm} /> Saving…
        </button>
        <button type="button" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(127,127,127,.3)', background: 'transparent', color: fg, fontWeight: 700 }}>
          <BrandLoader variant="inline" size="sm" calm={calm} /> Adding to cart
        </button>
      </div>
    </section>
  )
}

export default function LoaderPreview() {
  const [overlay, setOverlay] = useState<null | 'light' | 'dark'>(null)
  const [busy, setBusy] = useState(false)

  const simulate = (ms: number) => {
    setBusy(true)
    setTimeout(() => setBusy(false), ms)
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 80px', display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24 }}>BrandLoader preview</h1>
        <p style={{ margin: '6px 0 0', color: '#5f6368', fontSize: 14 }}>Dev only. The reduced-motion panels force the calm version; your OS setting applies to the others.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
        <section id="hero-light" style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(127,127,127,.18)' }}>
          <BrandLoader variant="section" size={240} />
        </section>
        <section id="hero-dark" style={{ background: '#0D1117', borderRadius: 20 }}>
          <BrandLoader variant="section" size={240} theme="dark" />
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: 20 }}>
        <Panel dark={false} calm={false} />
        <Panel dark calm={false} />
        <Panel dark={false} calm />
        <Panel dark calm />
      </div>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <strong style={{ fontSize: 14, marginInlineEnd: 6 }}>Fullscreen</strong>
        <button type="button" onClick={() => setOverlay('light')}>Light overlay</button>
        <button type="button" onClick={() => setOverlay('dark')}>Dark overlay</button>
        <span style={{ width: 16 }} />
        <strong style={{ fontSize: 14, marginInlineEnd: 6 }}>Managed (delay / min time / fade)</strong>
        <button type="button" onClick={() => simulate(100)}>100ms load (never shows)</button>
        <button type="button" onClick={() => simulate(1600)}>1.6s load</button>
      </section>

      <BrandLoader variant="fullscreen" active={busy} tagline />
      {overlay && (
        <div onClick={() => setOverlay(null)} style={{ cursor: 'pointer' }}>
          <BrandLoader variant="fullscreen" size="md" theme={overlay} tagline />
        </div>
      )}
    </main>
  )
}
