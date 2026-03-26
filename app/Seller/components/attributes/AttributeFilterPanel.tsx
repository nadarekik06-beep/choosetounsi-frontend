'use client'

/**
 * components/attributes/AttributeFilterPanel.tsx
 *
 * Dynamic sidebar filter panel.
 * Fetches the filterable attributes for a category and renders controls.
 *
 * Usage:
 *   <AttributeFilterPanel
 *     categorySlug="fashion-clothing"
 *     activeFilters={attrs}        // { color: [1,3], size: [5] }
 *     onFilterChange={setAttrs}
 *   />
 */

import { useEffect, useState } from 'react'
import type { Attribute, AttributeOption } from '@/types/Attributes'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Filters: attribute slug → array of selected option IDs
export type ActiveAttrFilters = Record<string, number[]>

interface Props {
  categorySlug: string
  subcategorySlug?: string | null
  activeFilters: ActiveAttrFilters
  onFilterChange: (filters: ActiveAttrFilters) => void
}

export default function AttributeFilterPanel({
  categorySlug, subcategorySlug, activeFilters, onFilterChange,
}: Props) {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!categorySlug) return
    setLoading(true)

    const url = subcategorySlug
      ? `${API_URL}/api/subcategories/${subcategorySlug}/attributes`
      : `${API_URL}/api/categories/${categorySlug}/filter-attributes`

    fetch(url, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => {
        const attrs: Attribute[] = json.attributes ?? json.data ?? []
        setAttributes(attrs)
        // Auto-expand first 3
        setExpanded(new Set(attrs.slice(0, 3).map(a => a.slug)))
      })
      .catch(() => setAttributes([]))
      .finally(() => setLoading(false))
  }, [categorySlug, subcategorySlug])

  const toggle = (slug: string, optionId: number) => {
    const current = activeFilters[slug] ?? []
    const next = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId]

    onFilterChange({ ...activeFilters, [slug]: next.length ? next : [] })
  }

  const toggleExpanded = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const hasAnyActive = Object.values(activeFilters).some(v => v.length > 0)

  const clearAll = () => onFilterChange({})

  if (loading) {
    return (
      <div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ height: 12, width: '60%', borderRadius: 4, marginBottom: 8, background: 'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.3s infinite linear' }} />
            <div style={{ height: 32, borderRadius: 8, background: 'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.3s infinite linear' }} />
          </div>
        ))}
        <style>{`@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
      </div>
    )
  }

  if (!attributes.length) return null

  return (
    <div>
      {/* Clear all */}
      {hasAnyActive && (
        <button
          onClick={clearAll}
          style={{
            width: '100%', marginBottom: 12, padding: '7px 12px',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, cursor: 'pointer',
            fontSize: 11, fontWeight: 800, color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <svg width='10' height='10' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><path d='M3 3l18 18M3 21L21 3'/></svg>
          Clear filters
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {attributes.map(attr => {
          const isOpen   = expanded.has(attr.slug)
          const selected = activeFilters[attr.slug] ?? []

          return (
            <div key={attr.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
              {/* Header */}
              <button
                type='button'
                onClick={() => toggleExpanded(attr.slug)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {attr.name}
                  {selected.length > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 999 }}>
                      {selected.length}
                    </span>
                  )}
                </span>
                <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d='M6 9l6 6 6-6'/>
                </svg>
              </button>

              {/* Options */}
              {isOpen && (
                <div style={{ paddingBottom: 12 }}>
                  {attr.type === 'color' ? (
                    // Color swatches
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 4 }}>
                      {attr.options.map(opt => {
                        const on = selected.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            type='button'
                            title={opt.value}
                            onClick={() => toggle(attr.slug, opt.id)}
                            style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: opt.color_hex ?? '#ccc',
                              border: on ? '2.5px solid #dc2626' : '2px solid #e5e7eb',
                              cursor: 'pointer', transform: on ? 'scale(1.15)' : 'none',
                              transition: 'transform 0.15s, border-color 0.15s',
                              boxShadow: on ? '0 0 0 2px rgba(220,38,38,0.2)' : 'none',
                            }}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    // Pill checkboxes
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 4 }}>
                      {attr.options.map(opt => {
                        const on = selected.includes(opt.id)
                        return (
                          <label key={opt.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                              transition: 'background 0.12s',
                              background: on ? 'rgba(220,38,38,0.06)' : 'transparent',
                            }}
                            className='hover:bg-red-50'
                          >
                            <div
                              onClick={() => toggle(attr.slug, opt.id)}
                              style={{
                                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                border: on ? '2px solid #dc2626' : '1.5px solid #d1d5db',
                                background: on ? '#dc2626' : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                            >
                              {on && (
                                <svg width='9' height='9' fill='none' stroke='#fff' strokeWidth='2.5' viewBox='0 0 24 24'>
                                  <path d='M20 6L9 17l-5-5'/>
                                </svg>
                              )}
                            </div>
                            <span onClick={() => toggle(attr.slug, opt.id)}
                              style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#dc2626' : '#374151', flex: 1 }}>
                              {opt.value}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}