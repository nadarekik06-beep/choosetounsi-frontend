'use client'

/**
 * app/seller/components/VariantBuilder.tsx
 *
 * Lets a seller define product variants by picking attribute options
 * and assigning stock + optional price per combination.
 *
 * Usage inside ProductModal:
 *   <VariantBuilder
 *     axes={variantAxes}
 *     existingVariants={variantRows}
 *     onChange={setVariantRows}
 *     basePrice={form.price}
 *     disabled={saving}
 *   />
 */

import { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import type { Attribute } from '@/types/Attributes'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantRow {
  id?: number
  option_ids: number[]
  stock: number
  price_override: string  // empty string = use product base price
  sku: string             // empty string = none
  is_active: boolean
}

/** Normalize a raw variant row coming from the API (may have null fields) */
function normalizeRow(raw: Partial<VariantRow> & { sku?: string | null; price_override?: string | number | null }): VariantRow {
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
  axes: Attribute[]              // attributes for this subcategory with type = color | select
  existingVariants?: VariantRow[]
  onChange: (variants: VariantRow[]) => void
  basePrice: string
  disabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantBuilder({
  axes,
  existingVariants = [],
  onChange,
  basePrice,
  disabled = false,
}: Props) {
  const [rows, setRows] = useState<VariantRow[]>(existingVariants.map(normalizeRow))

  const update = (updated: VariantRow[]) => {
    setRows(updated)
    onChange(updated)
  }

  const addRow = () => {
    update([
      ...rows,
      normalizeRow({
        option_ids:     new Array(axes.length).fill(0),
        stock:          0,
        price_override: '',
        sku:            '',
        is_active:      true,
      }),
    ])
  }

  const removeRow = (idx: number) => {
    update(rows.filter((_, i) => i !== idx))
  }

  const setField = <K extends keyof VariantRow>(idx: number, field: K, value: VariantRow[K]) => {
    const copy = [...rows]
    copy[idx] = { ...copy[idx], [field]: value }
    update(copy)
  }

  const setOption = (rowIdx: number, axisIdx: number, optionId: number) => {
    const copy = [...rows]
    const ids  = [...(copy[rowIdx].option_ids)]
    ids[axisIdx] = optionId
    copy[rowIdx] = { ...copy[rowIdx], option_ids: ids }
    update(copy)
  }

  // Nothing to show if subcategory has no selectable axes
  if (axes.length === 0) return null

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    border:       '1px solid #e5e7eb',
    borderRadius: 8,
    padding:      '7px 10px',
    fontSize:     13,
    background:   '#fff',
    color:        '#111',
    outline:      'none',
    fontFamily:   'inherit',
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
        }}>
          Variants ({rows.length})
        </p>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700,
            color: '#dc2626',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 8, padding: '5px 12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          <Plus size={12} /> Add variant
        </button>
      </div>

      {/* Info note */}
      {rows.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '10px 14px', marginBottom: 4,
        }}>
          <AlertCircle size={13} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Click "Add variant" to define combinations (e.g. Red / M, Blue / L).
            Each variant has its own stock and optional price.
          </p>
        </div>
      )}

      {/* Variant rows */}
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            border: '1px solid #e5e7eb', borderRadius: 12,
            padding: '12px 14px', marginBottom: 10,
            background: row.is_active ? '#f8fafc' : '#fafafa',
          }}
        >
          {/* Row number */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Variant #{rowIdx + 1}
              {row.option_ids.filter(Boolean).length === axes.length && (
                <span style={{ marginLeft: 8, color: '#10b981' }}>
                  ✓ {axes.map((ax, ai) => ax.options.find(o => o.id === row.option_ids[ai])?.value ?? '—').join(' / ')}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => removeRow(rowIdx)}
              disabled={disabled}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 6, opacity: disabled ? 0.4 : 1 }}
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Attribute selects + stock + price + sku */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${axes.map(() => '1fr').join(' ')} 80px 110px 120px`,
            gap: 10,
            alignItems: 'end',
          }}>

            {/* One <select> per axis */}
            {axes.map((axis, axisIdx) => (
              <div key={axis.id}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {axis.name}
                </label>
                <select
                  value={row.option_ids[axisIdx] ?? ''}
                  onChange={e => setOption(rowIdx, axisIdx, parseInt(e.target.value))}
                  disabled={disabled}
                  style={inputStyle}
                >
                  <option value="">— select —</option>
                  {axis.options.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Stock */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={row.stock ?? 0}
                onChange={e => setField(rowIdx, 'stock', parseInt(e.target.value) || 0)}
                disabled={disabled}
                style={inputStyle}
              />
            </div>

            {/* Price override */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Price (TND)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={row.price_override ?? ''}
                onChange={e => setField(rowIdx, 'price_override', e.target.value)}
                placeholder={basePrice || 'base'}
                disabled={disabled}
                style={inputStyle}
              />
            </div>

            {/* SKU */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                SKU
              </label>
              <input
                type="text"
                value={row.sku ?? ''}
                onChange={e => setField(rowIdx, 'sku', e.target.value)}
                placeholder="optional"
                disabled={disabled}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id={`variant-active-${rowIdx}`}
              checked={row.is_active}
              onChange={e => setField(rowIdx, 'is_active', e.target.checked)}
              disabled={disabled}
              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#dc2626' }}
            />
            <label htmlFor={`variant-active-${rowIdx}`} style={{ fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
              Active (visible to customers)
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}