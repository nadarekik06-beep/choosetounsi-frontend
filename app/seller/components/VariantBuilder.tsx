'use client'

/**
 * app/seller/components/VariantBuilder.tsx
 *
 * Seller variants: colors × the other axes (Taille, Pointure…).
 *
 * Colors
 * ──────
 *  • One color per "Couleur N" slot (radio): a variant has exactly one color option.
 *    Clicking another swatch replaces it. A color used by another slot is disabled.
 *  • "Multicolore" (option flagged is_multicolor) is for items with several colors on
 *    the same article. One per product, with an optional description ("Noir / Blanc")
 *    shown instead of "Multicolore". A second one shows an error and makes no rows.
 *  • Legacy products may have several colors in one variant: they load as one slot
 *    showing all its colors ("Noir + Blanc"), still editable / removable.
 *
 * Rows: slot1 × other axes, slot2 × other axes… (grouped by color in the table).
 * Unchanged: VariantRow, normalizeVariantRow, calculateTotalStock, validateVariantStocks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Info, AlertCircle, Plus, Trash2, ChevronDown, HelpCircle } from 'lucide-react'
import type { Attribute, AttributeOption } from '@/types/Attributes'
import { useTranslations, useLocale } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

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
  // Inactive variants can't be sold: the product total only counts active ones (as the API does)
  return variants.reduce((sum, row) => sum + (row.is_active === false ? 0 : (Number(row.stock) || 0)), 0)
}

export function validateVariantStocks(variants: VariantRow[]): Record<number, string> {
  const errors: Record<number, string> = {}
  variants.forEach((row, idx) => {
    const val = row.stock
    if (val === null || val === undefined || String(val) === '') {
      errors[idx] = 'stockRequired'   // message key in seller.variants
    } else if (!Number.isInteger(Number(val)) || Number(val) < 0) {
      errors[idx] = 'stockWhole'
    }
  })
  return errors
}

/** Setup problems reported to the form (blocks the submit). Message keys in seller.variants.errors */
export type VariantIssue =
  | { code: 'noColor' }
  | { code: 'emptyColor' }
  | { code: 'multicolorOnce' }
  | { code: 'noAxis'; axis: string }

/** Gradient of the Multicolore swatch (the API serves the same one in color_hex). */
export const MULTICOLOR_BG = 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%)'

export function swatchBackground(opt?: Pick<AttributeOption, 'color_hex' | 'is_multicolor'> | null): string {
  if (opt?.is_multicolor) return MULTICOLOR_BG
  return opt?.color_hex ?? '#e5e7eb'
}

// ─── Internal types ───────────────────────────────────────────────────────────

/** One "Couleur N" slot */
interface ColorGroup {
  /** Stable client-side ID (never sent to server) */
  id: string
  /** One color id (several only for legacy products) */
  colorOptionIds: number[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_COLOR_GROUPS = 10
const MULTICOLOR_LABEL_MAX = 40
const HELP_PREF_KEY = 'ct.seller.variantsHelp'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  axes: Attribute[]
  existingVariants?: VariantRow[]
  onChange: (variants: VariantRow[]) => void
  basePrice: string
  disabled?: boolean
  externalStockErrors?: Record<number, string>
  /** Multicolore description (one per product) */
  multicolorLabel?: string
  onMulticolorLabelChange?: (label: string) => void
  /** Setup problems, for the form's submit check */
  onIssuesChange?: (issues: VariantIssue[]) => void
  /** Show the setup problems inline (after a submit attempt) */
  showErrors?: boolean
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

function readHelpOpen(): boolean {
  try { return window.localStorage.getItem(HELP_PREF_KEY) !== 'closed' } catch { return true }
}

function writeHelpOpen(open: boolean) {
  try { window.localStorage.setItem(HELP_PREF_KEY, open ? 'open' : 'closed') } catch { /* private mode */ }
}

/**
 * Re-hydrate color slots from existing variant rows: each unique set of color ids
 * becomes one slot (one id; several for legacy rows).
 */
function hydrateColorGroups(
  existingVariants: VariantRow[],
  colorAxis: Attribute | null,
): ColorGroup[] {
  if (!colorAxis) return []
  if (existingVariants.length === 0) return [{ id: makeGroupId(), colorOptionIds: [] }]

  const seen = new Map<string, ColorGroup>()
  for (const row of existingVariants) {
    const colorIds = row.option_ids
      .filter(id => colorAxis.options.some(o => o.id === id))
      .sort((a, b) => a - b)
    if (colorIds.length === 0) continue
    const key = colorIds.join('|')
    if (!seen.has(key)) seen.set(key, { id: makeGroupId(), colorOptionIds: colorIds })
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
  multicolorLabel = '',
  onMulticolorLabelChange,
  onIssuesChange,
  showErrors = false,
}: Props) {
  const t = useTranslations('seller.variants')
  const { currency } = useFormat()
  // List separator for the summary (Arabic comma in Arabic)
  const sep = useLocale() === 'ar' ? '، ' : ', '

  // ── Identify the color axis ────────────────────────────────────────────────
  const colorAxis    = useMemo(() => axes.find(a => a.type === 'color') ?? null, [axes])
  const nonColorAxes = useMemo(() => axes.filter(a => a.type !== 'color'), [axes])
  // Palette with Multicolore last
  const palette = useMemo(() => colorAxis
    ? [...colorAxis.options].sort((a, b) => Number(!!a.is_multicolor) - Number(!!b.is_multicolor))
    : [], [colorAxis])
  const multicolorId = useMemo(() => colorAxis?.options.find(o => o.is_multicolor)?.id ?? null, [colorAxis])

  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() =>
    hydrateColorGroups(existingVariants, colorAxis)
  )

  // ── Selections for NON-COLOR axes ──────────────────────────────────────────
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

  // Legacy products saved without an axis (e.g. no size): that axis stays optional
  // for them, so the existing rows still load and save.
  const [legacyFreeAxes] = useState<Set<number>>(() => new Set(
    existingVariants.length === 0 ? [] : nonColorAxes
      .filter(axis => !existingVariants.some(row => row.option_ids.some(id => axis.options.some(o => o.id === id))))
      .map(a => a.id)
  ))

  const [rows,        setRows]        = useState<VariantRow[]>(() => existingVariants.map(normalizeVariantRow))
  const [stockErrors, setStockErrors] = useState<Record<number, string>>({})
  const [helpOpen,    setHelpOpen]    = useState<boolean>(readHelpOpen)
  const [bulkStock,   setBulkStock]   = useState('')
  const [bulkPrice,   setBulkPrice]   = useState('')

  // Slots holding Multicolore after the first one: an error, they make no rows
  const duplicateMulticolor = useMemo(() => {
    const ids = new Set<string>()
    if (multicolorId == null) return ids
    colorGroups.filter(g => g.colorOptionIds.includes(multicolorId)).slice(1).forEach(g => ids.add(g.id))
    return ids
  }, [colorGroups, multicolorId])

  // ── Notify parent ──────────────────────────────────────────────────────────
  useEffect(() => {
    onChange(rows)
    setStockErrors(validateVariantStocks(rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // ── Setup problems ─────────────────────────────────────────────────────────
  const issues = useMemo((): VariantIssue[] => {
    const out: VariantIssue[] = []
    if (colorAxis) {
      if (colorGroups.length === 0) out.push({ code: 'noColor' })
      else if (colorGroups.some(g => g.colorOptionIds.length === 0)) out.push({ code: 'emptyColor' })
      if (duplicateMulticolor.size > 0) out.push({ code: 'multicolorOnce' })
    }
    nonColorAxes.forEach((axis, i) => {
      if ((nonColorSelected[i] ?? []).length === 0 && !legacyFreeAxes.has(axis.id)) {
        out.push({ code: 'noAxis', axis: axis.name })
      }
    })
    return out
  }, [colorAxis, colorGroups, duplicateMulticolor, nonColorAxes, nonColorSelected, legacyFreeAxes])

  useEffect(() => {
    onIssuesChange?.(issues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues])

  // ── Regenerate rows whenever slots or non-color selections change ──────────
  useEffect(() => {
    if (axes.length === 0) return

    // Axes taking part in the combinations (legacy axis-free ones only when chosen)
    const activeSel = nonColorSelected.filter((sel, i) => sel.length > 0 || !legacyFreeAxes.has(nonColorAxes[i]?.id))
    const anyEmpty  = activeSel.some(sel => sel.length === 0)

    const merge = (combos: number[][]) => setRows(prev => {
      const existingMap = new Map(prev.map(r => [comboKey(r.option_ids), r]))
      return combos.map(combo => {
        const existing = existingMap.get(comboKey(combo))
        return existing ? { ...existing, option_ids: combo } : normalizeVariantRow({ option_ids: combo })
      })
    })

    // ── Case A: no color axis → cartesian of the other axes ───────────────────
    if (!colorAxis) {
      if (anyEmpty || activeSel.length === 0) { setRows([]); return }
      merge(cartesian(activeSel))
      return
    }

    // ── Case B: color axis → each slot × the other axes, slot after slot ──────
    const validGroups = colorGroups.filter(g => g.colorOptionIds.length > 0 && !duplicateMulticolor.has(g.id))
    if (validGroups.length === 0 || anyEmpty) { setRows([]); return }

    merge(validGroups.flatMap(group =>
      cartesian(activeSel).map(rest => [...group.colorOptionIds, ...rest])
    ))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorGroups, nonColorSelected, duplicateMulticolor])

  // ── Color slot management ─────────────────────────────────────────────────

  const addGroup = useCallback(() => {
    setColorGroups(prev => [...prev, { id: makeGroupId(), colorOptionIds: [] }])
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setColorGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  /** One color per slot: clicking a swatch replaces the slot's color. */
  const selectColor = useCallback((groupId: string, optId: number) => {
    setColorGroups(prev => prev.map(g => g.id === groupId ? { ...g, colorOptionIds: [optId] } : g))
  }, [])

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

  /** Bulk stock / price, on every row or on one color's rows. */
  const applyBulk = (colorKey?: string) => {
    const stock = bulkStock.trim() === '' ? null : Math.max(0, Math.floor(Number(bulkStock))) || 0
    const price = bulkPrice.trim()
    if (stock === null && price === '') return
    setRows(prev => prev.map(r => {
      if (colorKey !== undefined && colorKeyOf(r) !== colorKey) return r
      return { ...r, ...(stock !== null ? { stock } : {}), ...(price !== '' ? { price_override: price } : {}) }
    }))
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  const mcLabel = multicolorLabel.trim()
  const optionLabel = (opt?: AttributeOption) =>
    !opt ? '?' : (opt.is_multicolor && mcLabel ? mcLabel : opt.value)
  const colorOpt = (id: number) => colorAxis?.options.find(o => o.id === id)
  const isColorId = (id: number) => !!colorAxis?.options.some(o => o.id === id)
  const colorIdsOf = (r: VariantRow) => r.option_ids.filter(isColorId)
  const colorKeyOf = (r: VariantRow) => colorIdsOf(r).slice().sort((a, b) => a - b).join('|')
  const colorNameOf = (ids: number[]) => ids.map(id => optionLabel(colorOpt(id))).join(' + ')
  const otherLabel = (ids: number[]) => ids.map(id => {
    for (const axis of nonColorAxes) {
      const opt = axis.options.find(o => o.id === id)
      if (opt) return opt.value
    }
    return '?'
  })

  // ── Derived display values ────────────────────────────────────────────────

  const mergedStockErrors: Record<number, string> = { ...stockErrors, ...externalStockErrors }
  const totalStock     = calculateTotalStock(rows)
  const hasStockErrors = Object.keys(mergedStockErrors).length > 0
  const totalCombinations = rows.length

  // "Noir (38, 39), Blanc (38, 39)"
  const summary = useMemo(() => {
    if (!colorAxis) return ''
    const byColor = new Map<string, { ids: number[]; others: string[][] }>()
    rows.forEach(r => {
      const key = colorKeyOf(r)
      const entry = byColor.get(key) ?? { ids: colorIdsOf(r), others: nonColorAxes.map(() => []) }
      nonColorAxes.forEach((axis, i) => {
        const opt = axis.options.find(o => r.option_ids.includes(o.id))
        if (opt && !entry.others[i].includes(opt.value)) entry.others[i].push(opt.value)
      })
      byColor.set(key, entry)
    })
    return Array.from(byColor.values()).map(({ ids, others }) => {
      const detail = others.filter(o => o.length).map(o => o.join(sep)).join(' · ')
      return detail ? `${colorNameOf(ids)} (${detail})` : colorNameOf(ids)
    }).join(sep)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, colorAxis, nonColorAxes, mcLabel, sep])

  const issueText = (i: VariantIssue) =>
    i.code === 'noAxis' ? t('errors.noAxis', { axis: i.axis }) : t(`errors.${i.code}`)

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
  const hintStyle: React.CSSProperties = { fontSize: 11, color: '#5b6472', margin: '8px 0 0', lineHeight: 1.45 }
  const errorLine = (text: string) => (
    <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 700, margin: '8px 0 0' }}>
      <AlertCircle size={12} style={{ flexShrink: 0 }} /> {text}
    </p>
  )
  const smallBtn = (color: string, bg: string, bd: string): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${bd}`,
    borderRadius: 6, padding: '4px 10px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  })
  const dot = (opt: AttributeOption | undefined, size: number) => (
    <span title={optionLabel(opt)} style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: swatchBackground(opt), border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0,
    }} />
  )

  const sizeHint = (axis: Attribute) => {
    const unique = axis.options.some(o => /taille unique|one size|مقاس واحد/i.test(o.value))
    return unique ? `${t('sizeHint')} ${t('sizeHintUnique')}` : t('sizeHint')
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── How-to box (open the first time, then remembered) ─────────────── */}
      <div style={{
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12,
        marginBottom: 16, overflow: 'hidden',
      }}>
        <button
          type="button"
          aria-expanded={helpOpen}
          onClick={() => { setHelpOpen(o => { writeHelpOpen(!o); return !o }) }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
            fontSize: 13, fontWeight: 800, color: '#075985',
          }}
        >
          <Info size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{t('help.title')}</span>
          <ChevronDown size={14} style={{ transform: helpOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {helpOpen && (
          <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#0c4a6e', lineHeight: 1.5 }}>
            <ol style={{ margin: '0 0 8px', paddingInlineStart: 18, listStyle: 'decimal' }}>
              <li>{t('help.step1')}</li>
              <li>{t('help.step2')}</li>
              <li>{t('help.step3')}</li>
            </ol>
            <p style={{ margin: 0, color: '#0369a1', fontStyle: 'italic' }}>{t('help.example')}</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — Select options
          ══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#5b6472', margin: '0 0 12px',
        }}>
          {t('step1')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── COLORS (one per slot) ─────────────────────────────────────── */}
          {colorAxis && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                justifyContent: 'space-between', marginBottom: 6,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#64748b', margin: 0,
                }}>
                  {colorAxis.name}
                </p>

                <button
                  type="button"
                  disabled={disabled || colorGroups.length >= MAX_COLOR_GROUPS}
                  onClick={addGroup}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 700,
                    color: '#dc2626',
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 6, padding: '6px 10px', minHeight: 32,
                    cursor: disabled || colorGroups.length >= MAX_COLOR_GROUPS ? 'not-allowed' : 'pointer',
                    opacity: colorGroups.length >= MAX_COLOR_GROUPS ? 0.5 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={12} /> {t('addColor')}
                </button>
              </div>
              <p style={{ ...hintStyle, margin: '0 0 12px' }}>{t('colorHint')}</p>

              {colorGroups.length === 0 && (
                <div style={{
                  border: '1px dashed #e5e7eb', borderRadius: 8,
                  padding: '12px', textAlign: 'center',
                  fontSize: 12, color: '#5b6472',
                }}>
                  {t.rich('noColors', { b: (chunks) => <strong>{chunks}</strong> })}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {colorGroups.map((group, groupIdx) => {
                  const selected  = group.colorOptionIds
                  const legacy    = selected.length > 1
                  const isDupMc   = duplicateMulticolor.has(group.id)
                  const hasMc     = multicolorId != null && selected.includes(multicolorId) && !isDupMc
                  const usedElsewhere = new Set(colorGroups.filter(g => g.id !== group.id).flatMap(g => g.colorOptionIds))
                  const empty     = selected.length === 0

                  return (
                    <div
                      key={group.id}
                      style={{
                        background: '#fff',
                        border: `1px solid ${(showErrors && empty) || isDupMc ? '#fca5a5' : '#e5e7eb'}`,
                        borderRadius: 10, padding: '10px 12px',
                      }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        justifyContent: 'space-between', marginBottom: 8,
                      }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11, fontWeight: 800,
                          background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                          border: '1px solid rgba(220,38,38,0.15)',
                          padding: '2px 8px', borderRadius: 4, minWidth: 0,
                        }}>
                          {t('colorN', { n: groupIdx + 1 })}
                          {!empty && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#374151', minWidth: 0 }}>
                              {selected.map(id => <span key={id} style={{ display: 'inline-flex' }}>{dot(colorOpt(id), 10)}</span>)}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{colorNameOf(selected)}</span>
                            </span>
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeGroup(group.id)}
                          aria-label={t('remove')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 700,
                            color: '#5b6472',
                            background: 'transparent',
                            border: '1px solid #e5e7eb',
                            borderRadius: 5, padding: '4px 8px', minHeight: 28,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', flexShrink: 0,
                          }}
                        >
                          <Trash2 size={10} /> {t('remove')}
                        </button>
                      </div>

                      {legacy && <p style={{ ...hintStyle, margin: '0 0 8px', color: '#92400e' }}>{t('legacyGroup')}</p>}

                      {/* Swatches: one choice per slot */}
                      <div role="radiogroup" aria-label={t('colorN', { n: groupIdx + 1 })} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {palette.map(opt => {
                          const isSelected = selected.length === 1 && selected[0] === opt.id
                          const taken      = !opt.is_multicolor && usedElsewhere.has(opt.id)
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              disabled={disabled || taken}
                              onClick={() => selectColor(group.id, opt.id)}
                              title={taken ? `${opt.value} — ${t('colorTaken')}` : opt.value}
                              style={{
                                position: 'relative',
                                display: 'inline-flex', alignItems: 'center',
                                justifyContent: 'center',
                                width: 32, height: 32, borderRadius: '50%',
                                padding: 0,
                                cursor: (disabled || taken) ? 'not-allowed' : 'pointer',
                                border: isSelected ? '2.5px solid #dc2626' : '2px solid #e5e7eb',
                                background: swatchBackground(opt),
                                opacity: taken ? 0.3 : 1,
                                outline: isSelected ? '2px solid rgba(220,38,38,0.25)' : 'none',
                                outlineOffset: 1,
                                transition: 'all 0.15s',
                                fontFamily: 'inherit',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <span style={{
                                  position: 'absolute', inset: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13, fontWeight: 900, color: '#fff',
                                  textShadow: '0 0 3px rgba(0,0,0,0.8)', pointerEvents: 'none',
                                }}>✓</span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Multicolore: optional description */}
                      {hasMc && (
                        <label style={{ display: 'block', marginTop: 10 }}>
                          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                            {t('multicolorLabel')}
                          </span>
                          <input
                            type="text"
                            maxLength={MULTICOLOR_LABEL_MAX}
                            value={multicolorLabel}
                            onChange={e => onMulticolorLabelChange?.(e.target.value.slice(0, MULTICOLOR_LABEL_MAX))}
                            placeholder={t('multicolorPlaceholder')}
                            disabled={disabled}
                            style={{ ...inputStyle(), maxWidth: 320 }}
                          />
                        </label>
                      )}

                      {isDupMc && errorLine(t('errors.multicolorOnce'))}
                      {showErrors && empty && errorLine(t('errors.emptyColor'))}
                    </div>
                  )
                })}
              </div>
              {showErrors && colorGroups.length === 0 && errorLine(t('errors.noColor'))}
            </div>
          )}

          {/* ── OTHER axes (multi-select chips) ───────────────────────────── */}
          {nonColorAxes.map((axis, axisIdx) => {
            const selected = nonColorSelected[axisIdx] ?? []
            const missing  = showErrors && selected.length === 0 && !legacyFreeAxes.has(axis.id)
            return (
              <div key={axis.id} style={{
                background: '#f8fafc', border: `1px solid ${missing ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#64748b', margin: '0 0 10px',
                }}>
                  {axis.name}
                  <span style={{
                    marginInlineStart: 8, fontWeight: 500, color: '#5b6472',
                    textTransform: 'none', letterSpacing: 0,
                  }}>
                    {t('selectedCount', { count: selected.length })}
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
                        aria-pressed={isSelected}
                        onClick={() => toggleNonColor(axisIdx, opt.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', minHeight: 34, borderRadius: 8,
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
                <p style={hintStyle}>{sizeHint(axis)}</p>
                {missing && errorLine(t('errors.noAxis', { axis: axis.name }))}
              </div>
            )
          })}
        </div>

        {/* Live summary */}
        {totalCombinations > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <Info size={13} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: '#1e40af', margin: 0, lineHeight: 1.45 }}>
              {summary
                ? t('summary', { count: totalCombinations, detail: summary })
                : t('summaryNoColor', { count: totalCombinations })}
            </p>
          </div>
        )}

        {/* Incomplete selection (before any submit) */}
        {!showErrors && totalCombinations === 0 && issues.length > 0
          && (colorGroups.some(g => g.colorOptionIds.length > 0) || nonColorSelected.some(s => s.length > 0)) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <Info size={13} style={{ color: '#92400e', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>{issueText(issues[0])}</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — Stock / price table
          ══════════════════════════════════════════════════════════════════ */}
      {rows.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            justifyContent: 'space-between', marginBottom: 12,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#5b6472', margin: 0,
            }}>
              {t('step2', { count: rows.length })}
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
                fontSize: 10, fontWeight: 700, color: '#5b6472',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{t('total')}</span>
              <span style={{
                fontSize: 13, fontWeight: 900,
                color: hasStockErrors ? '#b91c1c' : '#047857',
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
                {t('allStocksRequired')}
              </p>
            </div>
          )}

          {/* Apply to all */}
          <div className="vb-bulk" style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8,
            background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 12px', marginBottom: 10,
          }}>
            <label style={{ width: 110 }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5b6472', marginBottom: 3 }}>{t('applyStock')}</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={bulkStock}
                onChange={e => setBulkStock(e.target.value)} placeholder="0" disabled={disabled} style={inputStyle()} />
            </label>
            <label style={{ width: 130 }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#5b6472', marginBottom: 3 }}>{t('applyPrice', { currency })}</span>
              <input type="number" min="0" step="0.001" inputMode="decimal" value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)} placeholder={basePrice || t('basePlaceholder')}
                title={t('priceHelp')} disabled={disabled} style={inputStyle()} />
            </label>
            <button type="button" disabled={disabled || (bulkStock.trim() === '' && bulkPrice.trim() === '')}
              onClick={() => applyBulk()}
              style={{ ...smallBtn('#4338ca', 'rgba(99,102,241,0.08)', 'rgba(99,102,241,0.25)'), padding: '7px 12px', minHeight: 34 }}>
              {t('applyAll')}
            </button>
          </div>

          {/* Phones: each combination becomes a small card (stock / price / SKU / active), no sideways scroll */}
          <style>{`
            .vb-mlabel { display: none; }
            @media (max-width: 640px) {
              .vb-head { display: none !important; }
              .vb-row {
                grid-template-columns: 1fr 1fr !important;
                gap: 10px !important;
                padding: 12px !important;
                border-top: 1px solid #e5e7eb !important;
                border-radius: 12px !important;
                margin-bottom: 8px;
              }
              .vb-color { border-radius: 10px !important; margin-bottom: 8px; border-top: 1px solid #e5e7eb !important; }
              .vb-row > .vb-name { grid-column: 1 / -1; padding-top: 0 !important; }
              .vb-row > .vb-name > span:last-child { white-space: normal !important; }
              .vb-mlabel { display: block; font-size: 11px; font-weight: 700; color: #5b6472; margin: 0 0 4px; }
              .vb-row > .vb-active { justify-content: flex-start !important; align-items: center; gap: 10px; padding-top: 0 !important; min-height: 44px; }
              .vb-row > .vb-active > .vb-mlabel { margin: 0; }
              .vb-row > .vb-active input { width: 24px !important; height: 24px !important; }
              .vb-quick button, .vb-bulk button, .vb-color button { min-height: 40px !important; }
              .vb-bulk label { flex: 1 1 120px; }
            }
          `}</style>

          {/* Table header */}
          <div className="vb-head" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 120px 120px 80px',
            gap: 8, padding: '6px 12px',
            background: '#f8fafc', borderRadius: '8px 8px 0 0',
            border: '1px solid #e5e7eb', borderBottom: 'none',
          }}>
            {(['combination', 'stock', 'price', 'sku', 'active'] as const).map(h => (
              <span key={h} title={h === 'price' ? t('priceHelp') : undefined} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: h === 'stock' ? '#dc2626' : '#5b6472',
                cursor: h === 'price' ? 'help' : undefined,
              }}>
                {t(`cols.${h}`, { currency })}
                {h === 'price' && <HelpCircle size={10} aria-label={t('priceHelp')} />}
              </span>
            ))}
          </div>

          {rows.map((row, rowIdx) => {
            const colorOptIds = colorIdsOf(row)
            const otherOptIds = row.option_ids.filter(id => !isColorId(id))
            const label       = colorAxis ? otherLabel(otherOptIds).join(' / ') || colorNameOf(colorOptIds) : otherLabel(otherOptIds).join(' / ')
            const isLast      = rowIdx === rows.length - 1
            const stockError  = mergedStockErrors[rowIdx]
            const key         = colorKeyOf(row)
            const newColor    = !!colorAxis && colorOptIds.length > 0 && (rowIdx === 0 || colorKeyOf(rows[rowIdx - 1]) !== key)

            return (
              <div key={row.option_ids.join('-')}>
                {/* Color header */}
                {newColor && (
                  <div className="vb-color" style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    padding: '6px 12px', background: '#fff7f7',
                    border: '1px solid #e5e7eb', borderTop: rowIdx === 0 ? '1px solid #e5e7eb' : 'none',
                  }}>
                    {colorOptIds.map(id => <span key={id} style={{ display: 'inline-flex' }}>{dot(colorOpt(id), 12)}</span>)}
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#111' }}>{colorNameOf(colorOptIds)}</span>
                    <button type="button"
                      disabled={disabled || (bulkStock.trim() === '' && bulkPrice.trim() === '')}
                      onClick={() => applyBulk(key)}
                      title={t('applyColorHint')}
                      style={{ ...smallBtn('#4338ca', 'transparent', 'rgba(99,102,241,0.25)'), marginInlineStart: 'auto', padding: '2px 8px',
                        opacity: (bulkStock.trim() === '' && bulkPrice.trim() === '') ? 0.5 : 1 }}>
                      {t('applyColor')}
                    </button>
                  </div>
                )}

                <div
                  className="vb-row"
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
                  <div className="vb-name" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    minWidth: 0, paddingTop: 6,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#374151',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  </div>

                  {/* Stock */}
                  <div>
                    <span className="vb-mlabel" style={{ color: '#dc2626' }}>{t('cols.stock', { currency })}</span>
                    <input
                      type="number" min="0" step="1" inputMode="numeric" required
                      data-variant-stock=""
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
                      <p style={{ fontSize: 10, color: '#b91c1c', margin: '3px 0 0', fontWeight: 600 }}>
                        {t(stockError as 'stockRequired' | 'stockWhole')}
                      </p>
                    )}
                  </div>

                  {/* Price override */}
                  <div>
                    <span className="vb-mlabel">{t('cols.price', { currency })}</span>
                    <input
                      type="number" min="0" step="0.001" inputMode="decimal"
                      value={row.price_override ?? ''}
                      onChange={e => updateRow(rowIdx, 'price_override', e.target.value)}
                      placeholder={basePrice || t('basePlaceholder')}
                      title={t('priceHelp')}
                      disabled={disabled}
                      style={inputStyle()}
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <span className="vb-mlabel">{t('cols.sku', { currency })}</span>
                    <input
                      type="text"
                      value={row.sku ?? ''}
                      onChange={e => updateRow(rowIdx, 'sku', e.target.value)}
                      placeholder={t('optional')}
                      disabled={disabled}
                      style={inputStyle()}
                    />
                  </div>

                  {/* Active */}
                  <label className="vb-active" style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                    <span className="vb-mlabel">{t('cols.active', { currency })}</span>
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={e => updateRow(rowIdx, 'is_active', e.target.checked)}
                      disabled={disabled}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
                    />
                  </label>
                </div>
              </div>
            )
          })}

          <p style={{ ...hintStyle, marginTop: 8 }}>{t('priceHelp')}</p>

          {/* Quick actions */}
          <div className="vb-quick" style={{
            display: 'flex', gap: 10, marginTop: 10,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#5b6472', fontWeight: 600 }}>{t('quickFill')}</span>
            <button
              type="button" disabled={disabled}
              onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: true })))}
              style={smallBtn('#047857', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.2)')}
            >{t('enableAll')}</button>
            <button
              type="button" disabled={disabled}
              onClick={() => setRows(prev => prev.map(r => ({ ...r, is_active: false })))}
              style={smallBtn('#b91c1c', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.2)')}
            >{t('disableAll')}</button>
          </div>
        </div>
      )}

      {/* Empty hint (no color axis, nothing chosen yet) */}
      {rows.length === 0 && !colorAxis
        && nonColorSelected.every(a => a.length === 0) && (
        <div style={{
          background: '#f8fafc', border: '1px dashed #e5e7eb',
          borderRadius: 10, padding: 16,
          textAlign: 'center', fontSize: 12, color: '#5b6472',
        }}>
          {t('hint')}
        </div>
      )}
    </div>
  )
}
