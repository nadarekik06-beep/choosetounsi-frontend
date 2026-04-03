'use client'

/**
 * app/seller/components/VariantBuilder.tsx
 *
 * UPDATED: Manual variant composition with multi-color support.
 *
 * KEY CHANGES vs previous version:
 *  - Removed auto-generate matrix (no more cartesian product)
 *  - Each row allows MULTIPLE color selections (up to MAX_COLORS_PER_VARIANT)
 *  - Non-color axes (e.g. Size) remain single-select per row
 *  - VariantRow.option_ids now contains: all selected color option IDs + other axis IDs
 *  - calculateTotalStock / validateVariantStocks / normalizeVariantRow are unchanged
 *    → backward compatible with parent (ProductModal)
 *
 * BACKWARD COMPATIBILITY:
 *  - Existing single-color variants load correctly (1 color = 1 selected swatch)
 *  - normalizeVariantRow is unchanged, so ProductModal's existing_variants load fine
 *  - calculateTotalStock / validateVariantStocks signatures are unchanged
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info, AlertCircle, Plus, Trash2 } from 'lucide-react'
import type { Attribute, AttributeOption } from '@/types/Attributes'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_COLORS_PER_VARIANT = 5

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One variant row.
 * option_ids = [colorOptId1, colorOptId2?, ..., sizeOptId, otherOptId, ...]
 *   All IDs are flat in a single array, same as before.
 *   The frontend knows which axis each ID belongs to via the axes[] order,
 *   but for multi-color the color axis contributes 1–MAX IDs instead of exactly 1.
 *
 * NEW FIELD: color_option_ids — the subset of option_ids that belong to the
 *   color axis. Used only internally by VariantBuilder for rendering.
 *   NOT sent to the backend (backend uses option_ids).
 */
export interface VariantRow {
  id?: number
  /**
   * Flat array of ALL selected option IDs for this variant.
   * For color: may contain 1–MAX_COLORS_PER_VARIANT IDs.
   * For other axes: exactly 1 ID (or 0 if not yet selected).
   * This is what gets serialized to FormData as variants[i][option_ids][j].
   */
  option_ids: number[]
  stock: number
  price_override: string
  sku: string
  is_active: boolean
}

/** Normalize raw API data (null → safe defaults). Unchanged from original. */
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

/** Unchanged from original. */
export function calculateTotalStock(variants: VariantRow[]): number {
  return variants.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)
}

/** Unchanged from original. */
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

// ─── Internal row state ───────────────────────────────────────────────────────

/**
 * Internal representation of one variant row.
 * Separates color selections (multi) from other axis selections (single).
 */
interface InternalRow {
  id?: number
  /** Color option IDs selected for this variant (1..MAX) */
  colorIds: number[]
  /** Other axis selections: axisSlug → single optionId (0 = unselected) */
  otherSelections: Record<string, number>
  stock: number
  price_override: string
  sku: string
  is_active: boolean
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  axes: Attribute[]
  existingVariants?: VariantRow[]
  onChange: (variants: VariantRow[]) => void
  basePrice: string
  disabled?: boolean
  externalStockErrors?: Record<number, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOptionIds(
  colorAxis: Attribute | null,
  colorIds: number[],
  otherSelections: Record<string, number>,
  axes: Attribute[]
): number[] {
  const ids: number[] = []

  // Add color IDs first (multi)
  if (colorAxis) {
    ids.push(...colorIds.filter(id => id > 0))
  }

  // Add other axis selections (single per axis)
  for (const axis of axes) {
    if (axis.type === 'color') continue
    const selected = otherSelections[axis.slug]
    if (selected && selected > 0) ids.push(selected)
  }

  return ids
}

/**
 * Given a flat option_ids array and the axis definitions,
 * split into colorIds[] and otherSelections{}.
 * Handles both old (1 color) and new (multi-color) rows.
 */
function splitOptionIds(
  optionIds: number[],
  colorAxis: Attribute | null,
  axes: Attribute[]
): { colorIds: number[]; otherSelections: Record<string, number> } {
  const colorIds: number[] = []
  const otherSelections: Record<string, number> = {}

  if (!colorAxis) {
    // No color axis — assign each ID to its axis by checking which axis owns it
    for (const axis of axes) {
      if (axis.type === 'color') continue
      for (const optId of optionIds) {
        if (axis.options.some(o => o.id === optId)) {
          otherSelections[axis.slug] = optId
          break
        }
      }
    }
    return { colorIds, otherSelections }
  }

  const colorOptionIds = new Set(colorAxis.options.map(o => o.id))

  for (const optId of optionIds) {
    if (colorOptionIds.has(optId)) {
      colorIds.push(optId)
    } else {
      // Find which non-color axis this option belongs to
      for (const axis of axes) {
        if (axis.type === 'color') continue
        if (axis.options.some(o => o.id === optId)) {
          otherSelections[axis.slug] = optId
          break
        }
      }
    }
  }

  return { colorIds, otherSelections }
}

function internalToExternal(
  row: InternalRow,
  colorAxis: Attribute | null,
  axes: Attribute[]
): VariantRow {
  return {
    id:             row.id,
    option_ids:     buildOptionIds(colorAxis, row.colorIds, row.otherSelections, axes),
    stock:          row.stock,
    price_override: row.price_override,
    sku:            row.sku,
    is_active:      row.is_active,
  }
}

function externalToInternal(
  row: VariantRow,
  colorAxis: Attribute | null,
  axes: Attribute[]
): InternalRow {
  const { colorIds, otherSelections } = splitOptionIds(row.option_ids, colorAxis, axes)
  return {
    id:              row.id,
    colorIds,
    otherSelections,
    stock:           row.stock,
    price_override:  row.price_override,
    sku:             row.sku,
    is_active:       row.is_active,
  }
}

function emptyInternalRow(): InternalRow {
  return {
    colorIds:        [],
    otherSelections: {},
    stock:           0,
    price_override:  '',
    sku:             '',
    is_active:       true,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Color swatch multi-selector for a single variant row */
function ColorMultiSelect({
  colorAxis,
  selectedIds,
  onChange,
  disabled,
}: {
  colorAxis: Attribute
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  const toggle = (optId: number) => {
    if (disabled) return
    if (selectedIds.includes(optId)) {
      onChange(selectedIds.filter(id => id !== optId))
    } else {
      if (selectedIds.length >= MAX_COLORS_PER_VARIANT) return
      onChange([...selectedIds, optId])
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {colorAxis.options.map(opt => {
          const chosen = selectedIds.includes(opt.id)
          const atMax  = !chosen && selectedIds.length >= MAX_COLORS_PER_VARIANT
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled || atMax}
              onClick={() => toggle(opt.id)}
              title={opt.value}
              style={{
                position: 'relative',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: opt.color_hex ?? '#e5e7eb',
                border: chosen ? '3px solid #dc2626' : '2px solid #e5e7eb',
                outline: chosen ? '2px solid rgba(220,38,38,0.25)' : 'none',
                outlineOffset: 1,
                cursor: (disabled || atMax) ? 'not-allowed' : 'pointer',
                opacity: atMax ? 0.4 : 1,
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {chosen && (
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff',
                  textShadow: '0 0 2px rgba(0,0,0,0.8)',
                  fontWeight: 900, lineHeight: 1,
                  pointerEvents: 'none',
                }}>
                  {selectedIds.indexOf(opt.id) + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected color labels */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {selectedIds.map(id => {
            const opt = colorAxis.options.find(o => o.id === id)
            return opt ? (
              <span key={id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                color: '#dc2626',
                padding: '2px 7px', borderRadius: 999,
              }}>
                {opt.color_hex && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
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

      {selectedIds.length === 0 && (
        <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0', fontWeight: 600 }}>
          Select at least one color
        </p>
      )}
      {selectedIds.length >= MAX_COLORS_PER_VARIANT && (
        <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>
          Max {MAX_COLORS_PER_VARIANT} colors reached
        </p>
      )}
    </div>
  )
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

  const colorAxis = useMemo(
    () => axes.find(a => a.type === 'color') ?? null,
    [axes]
  )

  const otherAxes = useMemo(
    () => axes.filter(a => a.type !== 'color'),
    [axes]
  )

  // Internal rows (split color multi vs other single)
  const [rows, setRows] = useState<InternalRow[]>(() =>
    existingVariants.map(r => externalToInternal(normalizeVariantRow(r), colorAxis, axes))
  )

  const [stockErrors, setStockErrors] = useState<Record<number, string>>({})

  // Notify parent whenever rows change
  useEffect(() => {
    const external = rows.map(r => internalToExternal(r, colorAxis, axes))
    onChange(external)
    setStockErrors(validateVariantStocks(external))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const mergedStockErrors: Record<number, string> = { ...stockErrors, ...externalStockErrors }
  const hasStockErrors = Object.keys(mergedStockErrors).length > 0

  const totalStock = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.stock) || 0), 0),
    [rows]
  )

  const addRow = useCallback(() => {
    setRows(prev => [...prev, emptyInternalRow()])
  }, [])

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateRow = useCallback((
    idx: number,
    patch: Partial<InternalRow>
  ) => {
    setRows(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }, [])

  if (axes.length === 0) return null

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
    transition: 'border-color 0.15s',
  })

  return (
    <div>

      {/* ── Info banner ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <Info size={13} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#1e40af' }}>
          <strong>Manual variant creation.</strong> Click <em>Add variant</em> to compose each variant.
          Each variant can have <strong>1–{MAX_COLORS_PER_VARIANT} colors</strong> and one option per other attribute (e.g. Size).
        </div>
      </div>

      {/* ── Stock validation banner ── */}
      {hasStockErrors && rows.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '8px 12px',
        }}>
          <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#dc2626', margin: 0, fontWeight: 600 }}>
            All variant stocks are required and must be whole numbers ≥ 0.
          </p>
        </div>
      )}

      {/* ── Variant rows ── */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>

          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: colorAxis
              ? `${otherAxes.length > 0 ? '1.8fr ' : ''}2fr ${otherAxes.map(() => '120px').join(' ')} 90px 110px 100px 52px 40px`
              : `${otherAxes.map(() => '140px').join(' ')} 90px 110px 100px 52px 40px`,
            gap: 8, padding: '5px 12px',
            background: '#f8fafc', borderRadius: '8px 8px 0 0',
            border: '1px solid #e5e7eb', borderBottom: 'none',
            alignItems: 'center',
          }}>
            {colorAxis && <span style={headerStyle}>Colors (1–{MAX_COLORS_PER_VARIANT})</span>}
            {otherAxes.map(a => (
              <span key={a.slug} style={headerStyle}>{a.name}</span>
            ))}
            <span style={{ ...headerStyle, color: '#dc2626' }}>Stock *</span>
            <span style={headerStyle}>Price (TND)</span>
            <span style={headerStyle}>SKU</span>
            <span style={{ ...headerStyle, textAlign: 'center' }}>Active</span>
            <span />
          </div>

          {/* Total stock badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: hasStockErrors ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${hasStockErrors ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              borderRadius: 8, padding: '3px 10px',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: hasStockErrors ? '#ef4444' : '#10b981' }}>
                {totalStock}
              </span>
            </div>
          </div>

          {rows.map((row, rowIdx) => {
            const isLast     = rowIdx === rows.length - 1
            const stockError = mergedStockErrors[rowIdx]

            return (
              <div
                key={rowIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: colorAxis
                    ? `${otherAxes.length > 0 ? '1.8fr ' : ''}2fr ${otherAxes.map(() => '120px').join(' ')} 90px 110px 100px 52px 40px`
                    : `${otherAxes.map(() => '140px').join(' ')} 90px 110px 100px 52px 40px`,
                  gap: 8, padding: '10px 12px',
                  background: row.is_active ? '#fff' : '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderTop: rowIdx === 0 ? undefined : 'none',
                  borderRadius: isLast ? '0 0 8px 8px' : 0,
                  alignItems: 'start',
                }}
              >
                {/* Color multi-select */}
                {colorAxis && (
                  <div style={{ paddingTop: 2 }}>
                    <ColorMultiSelect
                      colorAxis={colorAxis}
                      selectedIds={row.colorIds}
                      onChange={colorIds => updateRow(rowIdx, { colorIds })}
                      disabled={disabled}
                    />
                  </div>
                )}

                {/* Other axes — single select each */}
                {otherAxes.map(axis => (
                  <div key={axis.slug}>
                    <select
                      value={row.otherSelections[axis.slug] ?? 0}
                      onChange={e => updateRow(rowIdx, {
                        otherSelections: {
                          ...row.otherSelections,
                          [axis.slug]: Number(e.target.value),
                        },
                      })}
                      disabled={disabled}
                      style={{
                        ...inputStyle(),
                        paddingRight: 4,
                      }}
                    >
                      <option value={0}>— {axis.name} —</option>
                      {axis.options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.value}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Stock */}
                <div>
                  <input
                    type="number" min="0" step="1" required
                    value={row.stock ?? ''}
                    onChange={e => {
                      const parsed = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value)))
                      updateRow(rowIdx, { stock: parsed })
                    }}
                    onBlur={e => {
                      if (e.target.value === '') updateRow(rowIdx, { stock: 0 })
                    }}
                    disabled={disabled}
                    placeholder="0"
                    style={inputStyle(!!stockError)}
                  />
                  {stockError && (
                    <p style={{ fontSize: 10, color: '#ef4444', margin: '3px 0 0', fontWeight: 600 }}>{stockError}</p>
                  )}
                </div>

                {/* Price override */}
                <input
                  type="number" min="0" step="0.001"
                  value={row.price_override ?? ''}
                  onChange={e => updateRow(rowIdx, { price_override: e.target.value })}
                  placeholder={basePrice || 'base'}
                  disabled={disabled}
                  style={inputStyle()}
                />

                {/* SKU */}
                <input
                  type="text"
                  value={row.sku ?? ''}
                  onChange={e => updateRow(rowIdx, { sku: e.target.value })}
                  placeholder="optional"
                  disabled={disabled}
                  style={inputStyle()}
                />

                {/* Active */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 7 }}>
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={e => updateRow(rowIdx, { is_active: e.target.checked })}
                    disabled={disabled}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
                  />
                </div>

                {/* Remove */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => removeRow(rowIdx)}
                    disabled={disabled}
                    style={{
                      padding: 5, borderRadius: 7,
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.06)',
                      color: '#ef4444',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ── Add variant button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px',
          background: 'rgba(99,102,241,0.07)',
          border: '1.5px dashed rgba(99,102,241,0.35)',
          borderRadius: 10,
          color: '#6366f1', fontWeight: 700, fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
          marginTop: rows.length > 0 ? 4 : 0,
          width: '100%', justifyContent: 'center',
        }}
      >
        <Plus size={14} /> Add variant
      </button>

      {rows.length === 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
          No variants yet. Click <strong>Add variant</strong> to compose the first one.
        </p>
      )}

      {/* ── Quick fill tools (only when rows exist) ── */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Quick fill:</span>
          <button
            type="button" disabled={disabled}
            onClick={() => {
              const stockStr = prompt('Set stock for ALL variants:')
              if (stockStr === null) return
              const stock = Math.max(0, Math.floor(Number(stockStr))) || 0
              setRows(prev => prev.map(r => ({ ...r, stock })))
            }}
            style={quickBtnStyle('#6366f1')}
          >
            Set all stock
          </button>
          <button
            type="button" disabled={disabled}
            onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: true })))}
            style={quickBtnStyle('#10b981')}
          >
            Enable all
          </button>
          <button
            type="button" disabled={disabled}
            onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: false })))}
            style={quickBtnStyle('#ef4444')}
          >
            Disable all
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tiny style helpers ───────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#94a3b8',
}

function quickBtnStyle(color: string): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 700,
    color,
    background: `${color}14`,
    border: `1px solid ${color}33`,
    borderRadius: 6, padding: '4px 10px',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}