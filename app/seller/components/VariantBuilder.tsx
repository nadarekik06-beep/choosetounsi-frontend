'use client'

/**
 * app/seller/components/VariantBuilder.tsx
 *
 * WHAT CHANGED vs previous version
 * ──────────────────────────────────────────────────────────────────────────
 * Color axis now supports MULTIPLE color groups.
 *
 * OLD:  one set of colors (all selected colors = one shared group)
 *       cartesian: [Red+Blue] × [S,M,L] → 3 rows
 *
 * NEW:  seller can create N groups, each group is an independent
 *       multi-select of up to MAX_COLORS_PER_GROUP colors.
 *       cartesian: group1 × sizes, group2 × sizes, … concatenated
 *       e.g.  [Beige+Khaki] × [S,M,L]  +  [Black+Gold] × [S,M,L]  =  6 rows
 *
 * Rules
 * ──────
 *  • A color option can only belong to ONE group at a time.
 *    Options already used by another group are rendered disabled.
 *  • No hard limit on the number of groups (max 5 colors per group).
 *  • When there is NO color axis the component behaves exactly as before
 *    (single-select per non-color axis, unchanged cartesian).
 *
 * Everything else is identical to the original:
 *  • normalizeVariantRow, calculateTotalStock, validateVariantStocks
 *  • Non-color axes remain single-select
 *  • Table columns, quick-fill buttons, stock validation
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Info, AlertCircle, Plus, Trash2 } from 'lucide-react'
import type { Attribute, AttributeOption } from '@/types/Attributes'

// ─── Public types (unchanged) ─────────────────────────────────────────────────

export interface VariantRow {
  id?: number
  option_ids: number[]
  stock: number
  price_override: string
  sku: string
  is_active: boolean
}

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

export function calculateTotalStock(variants: VariantRow[]): number {
  return variants.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)
}

export function validateVariantStocks(variants: VariantRow[]): Record<number, string> {
  const errors: Record<number, string> = {}
  variants.forEach((row, idx) => {
    const val = row.stock
    if (val === null || val === undefined || String(val) === '') {
      errors[idx] = 'Stock is required.'
    } else if (!Number.isInteger(Number(val)) || Number(val) < 0) {
      errors[idx] = 'Must be a whole number ≥ 0.'
    }
  })
  return errors
}

// ─── Internal types ───────────────────────────────────────────────────────────

/** One color group managed by the seller */
interface ColorGroup {
  /** Stable client-side ID (never sent to server) */
  id: string
  /** Ordered list of selected color option IDs (max MAX_COLORS_PER_GROUP) */
  colorOptionIds: number[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_COLORS_PER_GROUP = 5
const MAX_COLOR_GROUPS     = 10

// ─── Props (unchanged) ────────────────────────────────────────────────────────

interface Props {
  axes: Attribute[]
  existingVariants?: VariantRow[]
  onChange: (variants: VariantRow[]) => void
  basePrice: string
  disabled?: boolean
  externalStockErrors?: Record<number, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cartesian(arrays: number[][]): number[][] {
  return arrays.reduce<number[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  )
}

function comboKey(optionIds: number[]) {
  return optionIds.slice().sort((a, b) => a - b).join('-')
}

function makeGroupId() {
  return Math.random().toString(36).slice(2, 9)
}

/**
 * Re-hydrate color groups from existing variant rows.
 *
 * Each unique sorted set of color IDs across the rows becomes one group.
 * e.g. rows with color IDs [3,7] and [11,15] → two groups.
 */
function hydrateColorGroups(
  existingVariants: VariantRow[],
  colorAxis: Attribute | null,
): ColorGroup[] {
  if (!colorAxis || existingVariants.length === 0) return []

  const seen = new Map<string, ColorGroup>()

  for (const row of existingVariants) {
    const colorIds = row.option_ids
      .filter(id => colorAxis.options.some(o => o.id === id))
      .sort((a, b) => a - b)

    if (colorIds.length === 0) continue

    const key = colorIds.join('|')
    if (!seen.has(key)) {
      seen.set(key, { id: makeGroupId(), colorOptionIds: colorIds })
    }
  }

  return Array.from(seen.values())
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantBuilder({
  axes,
  existingVariants = [],
  onChange,
  basePrice,
  disabled = false,
  externalStockErrors = {},
}: Props) {

  // ── Identify the color axis ────────────────────────────────────────────────
  const colorAxis    = useMemo(() => axes.find(a => a.type === 'color') ?? null, [axes])
  const nonColorAxes = useMemo(() => axes.filter(a => a.type !== 'color'), [axes])

  // ── Color groups (NEW) ────────────────────────────────────────────────────
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() =>
    hydrateColorGroups(existingVariants, colorAxis)
  )

  // ── Selections for NON-COLOR axes (unchanged single-select behaviour) ──────
  // Index matches nonColorAxes[], not axes[].
  const [nonColorSelected, setNonColorSelected] = useState<number[][]>(() => {
    if (existingVariants.length === 0 || nonColorAxes.length === 0) {
      return nonColorAxes.map(() => [])
    }
    const perAxis: Set<number>[] = nonColorAxes.map(() => new Set())
    existingVariants.forEach(row => {
      row.option_ids.forEach(optId => {
        nonColorAxes.forEach((axis, axisIdx) => {
          if (axis.options.some(o => o.id === optId)) {
            perAxis[axisIdx].add(optId)
          }
        })
      })
    })
    return perAxis.map(s => Array.from(s))
  })

  const [rows,        setRows]        = useState<VariantRow[]>(() => existingVariants.map(normalizeVariantRow))
  const [stockErrors, setStockErrors] = useState<Record<number, string>>({})


  // ── Notify parent ──────────────────────────────────────────────────────────
  useEffect(() => {
    onChange(rows)
    setStockErrors(validateVariantStocks(rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // ── Regenerate rows whenever groups or non-color selections change ──────────
  useEffect(() => {
    if (axes.length === 0) return

    // ── Case A: no color axis → original cartesian of non-color axes only ────
    if (!colorAxis) {
      const anyEmpty = nonColorSelected.some(sel => sel.length === 0)
      if (anyEmpty) { setRows([]); return }

      const combos = cartesian(nonColorSelected)
      setRows(prev => {
        const existingMap = new Map(prev.map(r => [comboKey(r.option_ids), r]))
        return combos.map(combo => {
          const key     = comboKey(combo)
          const existing = existingMap.get(key)
          return existing
            ? { ...existing, option_ids: combo }
            : normalizeVariantRow({ option_ids: combo })
        })
      })
      return
    }

    // ── Case B: color axis present ────────────────────────────────────────────
    // Need at least one valid group AND all non-color axes selected.
    const validGroups = colorGroups.filter(g => g.colorOptionIds.length > 0)
    if (validGroups.length === 0) { setRows([]); return }

    const anyNonColorEmpty = nonColorSelected.some(sel => sel.length === 0)
    if (anyNonColorEmpty && nonColorAxes.length > 0) { setRows([]); return }

    // For each valid group, generate its subset of rows:
    //   group.colorOptionIds × nonColorSelected[0] × nonColorSelected[1] × …
    // Then concatenate all subsets.
    const COLOR_SEP = '|'

    const allCombos: number[][] = validGroups.flatMap(group => {
      // Encode the whole color group as one token for cartesian()
      const colorToken = group.colorOptionIds.join(COLOR_SEP)

      const slotArrays: (number | string)[][] =
        nonColorAxes.length > 0
          ? [[colorToken], ...nonColorSelected]    // [colorGroup, sizeIds, ...]
          : [[colorToken]]                          // color only, no other axes

      const rawCombos = cartesian(slotArrays as number[][])

      // Decode back: the first element is the encoded color group token
      return rawCombos.map(combo =>
        combo.flatMap((token, slotIdx) => {
          if (slotIdx === 0) {
            // Color group token → expand back to individual IDs
            return String(token).split(COLOR_SEP).map(Number)
          }
          return [Number(token)]
        })
      )
    })

    setRows(prev => {
      const existingMap = new Map(prev.map(r => [comboKey(r.option_ids), r]))
      return allCombos.map(combo => {
        const key      = comboKey(combo)
        const existing = existingMap.get(key)
        return existing
          ? { ...existing, option_ids: combo }
          : normalizeVariantRow({ option_ids: combo })
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorGroups, nonColorSelected])

  // ── Color group management ────────────────────────────────────────────────

  const addGroup = useCallback(() => {
    setColorGroups(prev => [...prev, { id: makeGroupId(), colorOptionIds: [] }])
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setColorGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  /**
   * Toggle a color option inside a specific group.
   * A color already used in another group cannot be added (button is disabled).
   */
const toggleColorInGroup = useCallback((groupId: string, optId: number) => {
  setColorGroups(prev => prev.map(g => {
    if (g.id !== groupId) return g

    const pos = g.colorOptionIds.indexOf(optId)
    if (pos === -1) {
      if (g.colorOptionIds.length >= MAX_COLORS_PER_GROUP) return g  // max 5 per group
      return { ...g, colorOptionIds: [...g.colorOptionIds, optId] }
    } else {
      return { ...g, colorOptionIds: g.colorOptionIds.filter(id => id !== optId) }
    }
  }))
}, [])                          

  // ── Non-color axis toggle (single-select, unchanged) ──────────────────────
  const toggleNonColor = useCallback((axisIdx: number, optId: number) => {
    setNonColorSelected(prev => {
      const copy    = prev.map(a => [...a])
      const current = copy[axisIdx]
      const pos     = current.indexOf(optId)
      copy[axisIdx] = pos === -1
        ? [...current, optId]
        : current.filter(id => id !== optId)
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

  // ── Derived display values ────────────────────────────────────────────────

  const mergedStockErrors: Record<number, string> = { ...stockErrors, ...externalStockErrors }
  const totalStock    = calculateTotalStock(rows)
  const hasStockErrors = Object.keys(mergedStockErrors).length > 0

  const totalCombinations = rows.length   // always in sync

  // ── Early exit when no axes ───────────────────────────────────────────────
  if (axes.length === 0) return null

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    background: hasError ? '#fef2f2' : '#fff',
    color: '#111',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, background 0.15s',
  })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — Select options
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#94a3b8', margin: '0 0 12px',
        }}>
          Step 1 — Select available options per attribute
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── COLOR GROUPS section (only when colorAxis exists) ────────── */}
          {colorAxis && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '12px 14px',
            }}>
              {/* Header row */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 12,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#64748b', margin: 0,
                }}>
                  {colorAxis.name}
                  <span style={{
                    marginLeft: 8, fontSize: 9, fontWeight: 700,
                    color: '#6366f1',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    padding: '1px 6px', borderRadius: 4,
                    textTransform: 'none', letterSpacing: 0,
                  }}>
                    multi-group · max {MAX_COLORS_PER_GROUP} per group
                  </span>
                </p>

                {/* Add group button */}
                <button
                  type="button"
                  disabled={disabled || colorGroups.length >= MAX_COLOR_GROUPS}

                  onClick={addGroup}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700,
                    color: '#dc2626',
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 6, padding: '4px 10px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={11} /> Add group
                </button>
              </div>

              {/* Empty state */}
              {colorGroups.length === 0 && (
                <div style={{
                  border: '1px dashed #e5e7eb', borderRadius: 8,
                  padding: '12px', textAlign: 'center',
                  fontSize: 12, color: '#94a3b8',
                }}>
                  No color groups yet. Click <strong>Add group</strong> to create one.
                </div>
              )}

              {/* One card per group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {colorGroups.map((group, groupIdx) => {
                  const selected = group.colorOptionIds

                  return (
                    <div
                      key={group.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10, padding: '10px 12px',
                      }}
                    >
                      {/* Group header */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 8,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                          border: '1px solid rgba(220,38,38,0.15)',
                          padding: '2px 8px', borderRadius: 4,
                        }}>
                          Group {groupIdx + 1}
                          <span style={{
                            marginLeft: 6, fontWeight: 500, color: '#94a3b8',
                          }}>
                            ({selected.length}/{MAX_COLORS_PER_GROUP})
                          </span>
                        </span>

                        {/* Remove group */}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeGroup(group.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700,
                            color: '#94a3b8',
                            background: 'transparent',
                            border: '1px solid #e5e7eb',
                            borderRadius: 5, padding: '2px 7px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <Trash2 size={9} /> Remove
                        </button>
                      </div>

                      {/* Color swatches */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {colorAxis.options.map(opt => {
                          const isSelected    = selected.includes(opt.id)
                          
                          const atMax         = !isSelected && selected.length >= MAX_COLORS_PER_GROUP

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={disabled || disabled || atMax}
                              onClick={() => toggleColorInGroup(group.id, opt.id)}
                            title={opt.value}

                              style={{
                                position: 'relative',
                                display: 'inline-flex', alignItems: 'center',
                                justifyContent: 'center',
                                width: 32, height: 32, borderRadius: '50%',
                                padding: 0,
                                cursor: (disabled || atMax) ? 'not-allowed' : 'pointer',
                                border: isSelected
                                  ? '2.5px solid #dc2626'
                                  : '2px solid #e5e7eb',
                                background: opt.color_hex ?? '#e5e7eb',
opacity: atMax ? 0.4 : 1,
                                outline: isSelected
                                  ? '2px solid rgba(220,38,38,0.25)'
                                  : 'none',
                                outlineOffset: 1,
                                transition: 'all 0.15s',
                                fontFamily: 'inherit',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <span style={{
                                  position: 'absolute', inset: 0,
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10, fontWeight: 900,
                                  color: '#fff',
                                  textShadow: '0 0 3px rgba(0,0,0,0.7)',
                                  pointerEvents: 'none',
                                }}>
                                  {selected.indexOf(opt.id) + 1}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Selected color name pills */}
                      {selected.length > 0 && (
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8,
                        }}>
                          {selected.map((id, pos) => {
                            const opt = colorAxis.options.find(o => o.id === id)
                            return opt ? (
                              <span key={id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontSize: 11, fontWeight: 700,
                                background: 'rgba(220,38,38,0.06)',
                                border: '1px solid rgba(220,38,38,0.2)',
                                color: '#dc2626',
                                padding: '3px 8px', borderRadius: 999,
                              }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 900,
                                  background: '#dc2626', color: '#fff',
                                  borderRadius: '50%',
                                  width: 13, height: 13,
                                  display: 'inline-flex', alignItems: 'center',
                                  justifyContent: 'center', flexShrink: 0,
                                }}>
                                  {pos + 1}
                                </span>
                                {opt.color_hex && (
                                  <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: opt.color_hex,
                                    border: '1px solid rgba(0,0,0,0.15)',
                                    display: 'inline-block', flexShrink: 0,
                                  }} />
                                )}
                                {opt.value}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── NON-COLOR axes (unchanged single-select) ─────────────────── */}
          {nonColorAxes.map((axis, axisIdx) => {
            const selected = nonColorSelected[axisIdx] ?? []
            return (
              <div key={axis.id} style={{
                background: '#f8fafc', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#64748b', margin: '0 0 10px',
                }}>
                  {axis.name}
                  <span style={{
                    marginLeft: 8, fontWeight: 500, color: '#94a3b8',
                    textTransform: 'none', letterSpacing: 0,
                  }}>
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
                        onClick={() => toggleNonColor(axisIdx, opt.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 8,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          border: isSelected ? '2.5px solid #dc2626' : '1.5px solid #e5e7eb',
                          background: isSelected ? 'rgba(220,38,38,0.06)' : '#fff',
                          color: isSelected ? '#dc2626' : '#374151',
                          fontSize: 13, fontWeight: isSelected ? 700 : 500,
                          transition: 'all 0.15s', fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                      >
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

        {/* Combination count banner */}
        {totalCombinations > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <Info size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
              {totalCombinations} combination{totalCombinations !== 1 ? 's' : ''} will be generated.
              Set stock and price for each below.
            </p>
          </div>
        )}

        {/* Warning: incomplete selection */}
        {totalCombinations === 0
          && (colorGroups.length > 0 || nonColorAxes.some((_, i) => nonColorSelected[i]?.length > 0))
          && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <Info size={13} style={{ color: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
              {colorAxis
                ? 'Add at least one color group with colors selected, and select options for every other attribute.'
                : 'Select at least one option for every attribute to generate combinations.'}
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — Stock / price table
          ══════════════════════════════════════════════════════════════════ */}
      {rows.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 12,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
            }}>
              Step 2 — Set stock & price per combination ({rows.length} variants)
            </p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: hasStockErrors
                ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${hasStockErrors
                ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Total</span>
              <span style={{
                fontSize: 13, fontWeight: 900,
                color: hasStockErrors ? '#ef4444' : '#10b981',
              }}>
                {totalStock}
              </span>
            </div>
          </div>

          {hasStockErrors && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '8px 12px', marginBottom: 10,
            }}>
              <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#dc2626', margin: 0, fontWeight: 600 }}>
                All variant stocks are required and must be whole numbers ≥ 0.
              </p>
            </div>
          )}

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 120px 120px 80px',
            gap: 8, padding: '6px 12px',
            background: '#f8fafc', borderRadius: '8px 8px 0 0',
            border: '1px solid #e5e7eb', borderBottom: 'none',
          }}>
            {['Combination', 'Stock *', 'Price (TND)', 'SKU', 'Active'].map(h => (
              <span key={h} style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: h === 'Stock *' ? '#dc2626' : '#94a3b8',
              }}>
                {h}
              </span>
            ))}
          </div>

          {rows.map((row, rowIdx) => {
            // Build the human-readable label for this row
            const colorOptIds = colorAxis
              ? row.option_ids.filter(id => colorAxis.options.some(o => o.id === id))
              : []
            const otherOptIds = colorAxis
              ? row.option_ids.filter(id => !colorAxis.options.some(o => o.id === id))
              : row.option_ids

            const colorLabel = colorOptIds
              .map(id => colorAxis?.options.find(o => o.id === id)?.value ?? '?')
              .join('+')

            const otherLabel = otherOptIds.map(id => {
              for (const axis of axes) {
                const opt = axis.options.find(o => o.id === id)
                if (opt) return opt.value
              }
              return '?'
            }).join(' / ')

            const label      = [colorLabel, otherLabel].filter(Boolean).join(' / ')
            const isLast     = rowIdx === rows.length - 1
            const stockError = mergedStockErrors[rowIdx]

            return (
              <div
                key={row.option_ids.join('-')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 120px 120px 80px',
                  gap: 8, padding: '8px 12px',
                  background: row.is_active ? '#fff' : '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderRadius: isLast ? '0 0 8px 8px' : 0,
                  alignItems: 'start',
                }}
              >
                {/* Label */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  minWidth: 0, paddingTop: 6,
                }}>
                  {colorAxis && colorOptIds.map(id => {
                    const opt = colorAxis.options.find(o => o.id === id)
                    if (!opt?.color_hex) return null
                    return (
                      <span key={id} title={opt.value} style={{
                        display: 'inline-block', width: 14, height: 14,
                        borderRadius: '50%', background: opt.color_hex,
                        border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0,
                      }} />
                    )
                  })}
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#374151',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>

                {/* Stock */}
                <div>
                  <input
                    type="number" min="0" step="1" required
                    value={row.stock ?? ''}
                    onChange={e => {
                      const raw    = e.target.value
                      const parsed = raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)))
                      updateRow(rowIdx, 'stock', parsed)
                    }}
                    onBlur={e => {
                      if (e.target.value === '') updateRow(rowIdx, 'stock', 0)
                    }}
                    disabled={disabled}
                    placeholder="0"
                    style={inputStyle(!!stockError)}
                  />
                  {stockError && (
                    <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0', fontWeight: 600 }}>
                      {stockError}
                    </p>
                  )}
                </div>

                {/* Price override */}
                <input
                  type="number" min="0" step="0.001"
                  value={row.price_override ?? ''}
                  onChange={e => updateRow(rowIdx, 'price_override', e.target.value)}
                  placeholder={basePrice || 'base'}
                  disabled={disabled}
                  style={inputStyle()}
                />

                {/* SKU */}
                <input
                  type="text"
                  value={row.sku ?? ''}
                  onChange={e => updateRow(rowIdx, 'sku', e.target.value)}
                  placeholder="optional"
                  disabled={disabled}
                  style={inputStyle()}
                />

                {/* Active */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
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

          {/* Quick fill */}
          <div style={{
            display: 'flex', gap: 10, marginTop: 10,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Quick fill:</span>
            <button
              type="button" disabled={disabled}
              onClick={() => {
                const s = prompt('Set stock for ALL variants:')
                if (s === null) return
                const stock = Math.max(0, Math.floor(Number(s))) || 0
                setRows(prev => prev.map(r => ({ ...r, stock })))
              }}
              style={{
                fontSize: 11, fontWeight: 700, color: '#6366f1',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 6, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Set all stock</button>
            <button
              type="button" disabled={disabled}
              onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: true })))}
              style={{
                fontSize: 11, fontWeight: 700, color: '#10b981',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 6, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Enable all</button>
            <button
              type="button" disabled={disabled}
              onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: false })))}
              style={{
                fontSize: 11, fontWeight: 700, color: '#ef4444',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: '4px 10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Disable all</button>
          </div>
        </div>
      )}

      {/* Empty hint */}
      {rows.length === 0
        && colorGroups.length === 0
        && nonColorSelected.every(a => a.length === 0) && (
        <div style={{
          background: '#f8fafc', border: '1px dashed #e5e7eb',
          borderRadius: 10, padding: 16,
          textAlign: 'center', fontSize: 12, color: '#94a3b8',
        }}>
          {colorAxis
            ? 'Add a color group and select sizes to generate variant combinations automatically.'
            : 'Select options above to generate variant combinations automatically.'}
        </div>
      )}
    </div>
  )
}