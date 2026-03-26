'use client'

/**
 * components/SubcategoryNav.tsx
 *
 * Horizontal scrollable pill row rendered below the category hero.
 * Clicking a pill sets the active subcategory and resets attribute filters.
 */

import type { Subcategory } from '@/types/Attributes'

interface Props {
  subcategories: Subcategory[]
  activeSlug: string | null
  onSelect: (slug: string | null) => void
  loading?: boolean
}

export default function SubcategoryNav({ subcategories, activeSlug, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 8, padding: '12px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, height: 32, width: 80 + (i % 3) * 20, borderRadius: 999,
            background: 'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)',
            backgroundSize: '600px 100%', animation: 'shimmer 1.3s infinite linear',
          }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
      </div>
    )
  }

  if (!subcategories.length) return null

  return (
    <>
      <style>{`
        .subcat-pill { transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s; }
        .subcat-pill:hover { border-color: #dc2626 !important; color: #dc2626 !important; transform: translateY(-1px); }
      `}</style>
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {/* "All" pill */}
        <button
          onClick={() => onSelect(null)}
          className='subcat-pill'
          style={{
            flexShrink: 0,
            padding: '6px 16px', borderRadius: 999,
            border: `1.5px solid ${activeSlug === null ? '#dc2626' : '#e5e7eb'}`,
            background: activeSlug === null ? '#dc2626' : '#fff',
            color: activeSlug === null ? '#fff' : '#52525b',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All
        </button>

        {subcategories.map(sub => {
          const active = activeSlug === sub.slug
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(active ? null : sub.slug)}
              className='subcat-pill'
              style={{
                flexShrink: 0,
                padding: '6px 16px', borderRadius: 999,
                border: `1.5px solid ${active ? '#dc2626' : '#e5e7eb'}`,
                background: active ? '#dc2626' : '#fff',
                color: active ? '#fff' : '#52525b',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {sub.icon && <span style={{ marginRight: 5 }}>{sub.icon}</span>}
              {sub.name}
            </button>
          )
        })}
      </div>
    </>
  )
}