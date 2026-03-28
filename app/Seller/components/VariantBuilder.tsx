'use client'

/**
 * app/seller/components/VariantBuilder.tsx
 *
 * REFACTORED: Combination matrix approach.
 *
 * Flow:
 *  1. For each variant axis (Color, Size, …) show a multi-select of all options.
 *  2. When the seller picks options, combinations are AUTO-GENERATED (Cartesian product).
 *  3. Each generated combination gets its own stock + optional price inputs.
 *
 * Example:
 *   Color: [Red ✓] [Black ✓]
 *   Size:  [S ✓] [M ✓]
 *   → Generates: Red/S, Red/M, Black/S, Black/M  (4 rows)
 *
 * Only attributes with is_variant=true are passed as `axes`.
 * Informational attributes are handled separately by DynamicAttributeSection.
 */

import { useState, useEffect, useCallback } from 'react'
import { Info } from 'lucide-react'
import type { Attribute, AttributeOption } from '@/types/Attributes'

// ─── Types ────────────────────────────────────────────────────────────────────

/** One generated combination row */
export interface VariantRow {
  /** Present when editing an existing saved variant */
  id?: number
  /** Exactly one option_id per axis, in the same order as axes[] */
  option_ids: number[]
  stock: number
  price_override: string   // '' = use product base price
  sku: string
  is_active: boolean
}

/** Normalize raw API data (null → safe defaults) */
export function normalizeVariantRow(
  raw: Partial<VariantRow> & { sku?: string | null; price_override?: string | number | null }
): VariantRow {
  return {
    id:             raw.id,
    option_ids:     raw.option_ids ?? [],
    stock:          raw.stock ?? 0,
    price_override: raw.price_override != null ? String(raw.price_override) : '',
    sku:            raw.sku ?? '',
    is_active:      raw.is_active ?? true,
  }
}

interface Props {
  /** Attributes with is_variant=true for this subcategory */
  axes: Attribute[]
  /** Existing variants when editing a product */
  existingVariants?: VariantRow[]
  onChange: (variants: VariantRow[]) => void
  basePrice: string
  disabled?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cartesian product of option arrays.
 * cartesian([[1,2],[3,4]]) → [[1,3],[1,4],[2,3],[2,4]]
 */
function cartesian(arrays: number[][]): number[][] {
  return arrays.reduce<number[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  )
}

/** Build a stable key for a combination to match against existing variants */
function comboKey(optionIds: number[]) {
  return optionIds.slice().sort((a, b) => a - b).join('-')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantBuilder({
  axes,
  existingVariants = [],
  onChange,
  basePrice,
  disabled = false,
}: Props) {

  // Which options are selected per axis (index → Set of option IDs)
  const [selectedPerAxis, setSelectedPerAxis] = useState<number[][]>(() => {
    if (existingVariants.length === 0 || axes.length === 0) {
      return axes.map(() => [])
    }

    // Re-derive selected options from existing variant rows
    const perAxis: Set<number>[] = axes.map(() => new Set())
    existingVariants.forEach(row => {
      row.option_ids.forEach((optId, axisIdx) => {
        if (optId > 0 && axisIdx < axes.length) perAxis[axisIdx].add(optId)
      })
    })
    return perAxis.map(s => Array.from(s))
  })

  // Generated combination rows (keyed by sorted option_ids string for stable identity)
  const [rows, setRows] = useState<VariantRow[]>(() =>
    existingVariants.map(normalizeVariantRow)
  )

  // Notify parent whenever rows change — never call onChange inside a setter or render
  useEffect(() => {
    onChange(rows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // Regenerate rows whenever selected options change
  useEffect(() => {
    if (axes.length === 0) return

    // Only generate if every axis has at least one option selected
    const anyAxisEmpty = selectedPerAxis.some(opts => opts.length === 0)
    if (anyAxisEmpty) {
      setRows([])
      return
    }

    const combinations = cartesian(selectedPerAxis)   // [[optId1, optId2], ...]

    setRows(prev => {
      const existingMap = new Map<string, VariantRow>()
      prev.forEach(r => existingMap.set(comboKey(r.option_ids), r))

      return combinations.map(combo => {
        const key      = comboKey(combo)
        const existing = existingMap.get(key)
        // Preserve stock/price/sku/is_active if this combination already existed
        return existing
          ? { ...existing, option_ids: combo }
          : normalizeVariantRow({ option_ids: combo })
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerAxis])

  const toggleOption = useCallback((axisIdx: number, optId: number) => {
    setSelectedPerAxis(prev => {
      const copy     = prev.map(a => [...a])
      const current  = copy[axisIdx]
      const pos      = current.indexOf(optId)
      if (pos === -1) {
        copy[axisIdx] = [...current, optId]
      } else {
        copy[axisIdx] = current.filter(id => id !== optId)
      }
      return copy
    })
  }, [])

  const updateRow = useCallback((
    idx: number,
    field: 'stock' | 'price_override' | 'sku' | 'is_active',
    value: number | string | boolean
  ) => {
    setRows(prev => {
      const copy = [...prev]
      copy[idx]  = { ...copy[idx], [field]: value }
      return copy
    })
  }, [])

  // Nothing to render when no axes
  if (axes.length === 0) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '6px 10px', fontSize: 13, background: '#fff',
    color: '#111', outline: 'none', fontFamily: 'inherit',
  }

  const totalCombinations = selectedPerAxis.every(a => a.length > 0)
    ? selectedPerAxis.reduce((acc, a) => acc * a.length, 1)
    : 0

  return (
    <div>

      {/* ── Step 1: Select options per axis ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '0 0 12px' }}>
          Step 1 — Select available options per attribute
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {axes.map((axis, axisIdx) => {
            const selected = selectedPerAxis[axisIdx] ?? []
            return (
              <div key={axis.id} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', margin: '0 0 10px' }}>
                  {axis.name}
                  <span style={{ marginLeft: 8, fontWeight: 500, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>
                    ({selected.length} selected)
                  </span>
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {axis.options.map(opt => {
                    const isSelected = selected.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleOption(axisIdx, opt.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
                          border: isSelected ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                          background: isSelected ? 'rgba(220,38,38,0.06)' : '#fff',
                          color: isSelected ? '#dc2626' : '#374151',
                          fontSize: 13, fontWeight: isSelected ? 700 : 500,
                          transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                      >
                        {/* Color swatch for color-type attributes */}
                        {axis.type === 'color' && opt.color_hex && (
                          <span style={{
                            display: 'inline-block', width: 12, height: 12,
                            borderRadius: '50%', background: opt.color_hex,
                            border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0,
                          }} />
                        )}
                        {opt.value}
                        {isSelected && (
                          <span style={{ fontSize: 10, color: '#dc2626' }}>✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary hint */}
        {totalCombinations > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 12px' }}>
            <Info size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
              {totalCombinations} combination{totalCombinations !== 1 ? 's' : ''} will be generated.
              Set stock and price for each below.
            </p>
          </div>
        )}

        {selectedPerAxis.some(a => a.length === 0) && selectedPerAxis.some(a => a.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px' }}>
            <Info size={13} style={{ color: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
              Select at least one option for every attribute to generate combinations.
            </p>
          </div>
        )}
      </div>

      {/* ── Step 2: Stock/price per combination ── */}
      {rows.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '0 0 12px' }}>
            Step 2 — Set stock & price per combination ({rows.length} variants)
          </p>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 120px 120px 80px',
            gap: 8, padding: '6px 12px',
            background: '#f8fafc', borderRadius: '8px 8px 0 0',
            border: '1px solid #e5e7eb', borderBottom: 'none',
          }}>
            {['Combination', 'Stock', 'Price (TND)', 'SKU', 'Active'].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                {h}
              </span>
            ))}
          </div>

          {rows.map((row, rowIdx) => {
            // Build the label for this combination
            const label = axes.map((axis, ai) => {
              const opt = axis.options.find(o => o.id === row.option_ids[ai])
              return opt ? opt.value : '?'
            }).join(' / ')

            const isLast = rowIdx === rows.length - 1

            return (
              <div
                key={row.option_ids.join('-')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 90px 120px 120px 80px',
                  gap: 8, padding: '8px 12px',
                  background: row.is_active ? '#fff' : '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderRadius: isLast ? '0 0 8px 8px' : 0,
                  alignItems: 'center',
                }}
              >
                {/* Combination label with color swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {axes.map((axis, ai) => {
                    if (axis.type !== 'color') return null
                    const opt = axis.options.find(o => o.id === row.option_ids[ai])
                    if (!opt?.color_hex) return null
                    return (
                      <span key={ai} title={opt.value} style={{
                        display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                        background: opt.color_hex, border: '1px solid rgba(0,0,0,0.12)',
                        flexShrink: 0,
                      }} />
                    )
                  })}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>

                {/* Stock */}
                <input
                  type="number" min="0"
                  value={row.stock ?? 0}
                  onChange={e => updateRow(rowIdx, 'stock', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  style={inputStyle}
                />

                {/* Price override */}
                <input
                  type="number" min="0" step="0.001"
                  value={row.price_override ?? ''}
                  onChange={e => updateRow(rowIdx, 'price_override', e.target.value)}
                  placeholder={basePrice || 'base'}
                  disabled={disabled}
                  style={inputStyle}
                />

                {/* SKU */}
                <input
                  type="text"
                  value={row.sku ?? ''}
                  onChange={e => updateRow(rowIdx, 'sku', e.target.value)}
                  placeholder="optional"
                  disabled={disabled}
                  style={inputStyle}
                />

                {/* Active toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={e => updateRow(rowIdx, 'is_active', e.target.checked)}
                    disabled={disabled}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
                  />
                </div>
              </div>
            )
          })}

          {/* Quick fill tools */}
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Quick fill:</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const stockStr = prompt('Set stock for ALL variants:')
                if (stockStr === null) return
                const stock = parseInt(stockStr) || 0
                setRows(prev => prev.map(r => ({ ...r, stock })))
              }}
              style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Set all stock
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setRows(prev => prev.map(r => ({ ...r, is_active: true })))
              }}
              style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Enable all
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setRows(prev => prev.map(r => ({ ...r, is_active: false })))
              }}
              style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Disable all
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 && selectedPerAxis.every(a => a.length === 0) && (
        <div style={{ background: '#f8fafc', border: '1px dashed #e5e7eb', borderRadius: 10, padding: '16px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          Select options above to generate variant combinations automatically.
        </div>
      )}
    </div>
  )
}