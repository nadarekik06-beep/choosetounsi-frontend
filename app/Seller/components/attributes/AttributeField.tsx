'use client'

/**
 * components/attributes/AttributeField.tsx
 *
 * Renders the correct input control for an attribute based on its type.
 */

import { Attribute, AttributeValues } from '@/types/Attributes'

interface Props {
  attr: Attribute
  values: AttributeValues
  onChange: (slug: string, value: AttributeValues[string]) => void
  disabled?: boolean
}

/* ── Shared input style ── */
const inputCls = (err?: boolean) =>
  `w-full border rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400
   outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition
   ${err ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`

export default function AttributeField({ attr, values, onChange, disabled }: Props) {
  const value = values[attr.slug]

  const required = attr.is_required

  // ── SELECT (single) ─────────────────────────────────────────────────────
  if (attr.type === 'select') {
    return (
      <select
        value={(value as number) ?? ''}
        onChange={e => onChange(attr.slug, e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className={inputCls()}
        required={required}
      >
        <option value=''>Select {attr.name}</option>
        {attr.options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.value}</option>
        ))}
      </select>
    )
  }

  // ── MULTISELECT (checkboxes) ────────────────────────────────────────────
  if (attr.type === 'multiselect') {
    const selected = (value as number[]) ?? []
    const toggle = (id: number) => {
      const next = selected.includes(id)
        ? selected.filter(v => v !== id)
        : [...selected, id]
      onChange(attr.slug, next)
    }

    return (
      <div className='flex flex-wrap gap-2'>
        {attr.options.map(opt => {
          const on = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type='button'
              onClick={() => !disabled && toggle(opt.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-700 transition select-none
                ${on
                  ? 'border-red-500 bg-red-50 text-red-600 font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'}`}
            >
              {opt.value}
            </button>
          )
        })}
      </div>
    )
  }

  // ── COLOR (color swatch picker) ─────────────────────────────────────────
  if (attr.type === 'color') {
    const selected = (value as number[]) ?? []
    const toggle = (id: number) => {
      const next = selected.includes(id)
        ? selected.filter(v => v !== id)
        : [...selected, id]
      onChange(attr.slug, next)
    }

    return (
      <div className='flex flex-wrap gap-2'>
        {attr.options.map(opt => {
          const on = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type='button'
              onClick={() => !disabled && toggle(opt.id)}
              title={opt.value}
              className={`w-8 h-8 rounded-full border-2 transition ${on ? 'border-red-500 scale-110 shadow-md' : 'border-slate-200 hover:border-slate-400'}`}
              style={{ background: opt.color_hex ?? '#ccc' }}
            />
          )
        })}
      </div>
    )
  }

  // ── BOOLEAN (toggle) ────────────────────────────────────────────────────
  if (attr.type === 'boolean') {
    const on = !!(value as boolean)
    return (
      <div
        onClick={() => !disabled && onChange(attr.slug, !on)}
        className={`relative w-10 h-6 rounded-full cursor-pointer transition-colors ${on ? 'bg-red-500' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
      </div>
    )
  }

  // ── NUMBER ──────────────────────────────────────────────────────────────
  if (attr.type === 'number') {
    return (
      <input
        type='number'
        min={0}
        value={(value as number | string) ?? ''}
        onChange={e => onChange(attr.slug, e.target.value)}
        disabled={disabled}
        placeholder={attr.name}
        className={inputCls()}
        required={required}
      />
    )
  }

  // ── TEXT (default) ──────────────────────────────────────────────────────
  return (
    <input
      type='text'
      value={(value as string) ?? ''}
      onChange={e => onChange(attr.slug, e.target.value)}
      disabled={disabled}
      placeholder={attr.name}
      className={inputCls()}
      required={required}
    />
  )
}