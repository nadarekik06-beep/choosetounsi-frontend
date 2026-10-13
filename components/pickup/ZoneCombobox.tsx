'use client'

/**
 * Intigo's "Zone (Délégation/Secteur)" picker: type to filter (accent-
 * insensitive, partial), DELEGATION / SECTEUR badge on the right, arrow keys +
 * Enter, Escape. Only a zone picked from the list is a value: typing again
 * clears it, free text is never accepted.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MapPin, Search, X } from 'lucide-react'
import { searchZones, type ZoneOption } from '@/lib/pickupAddress'

interface Props {
  id?: string
  value: ZoneOption | null
  onChange: (zone: ZoneOption | null) => void
  error?: string
  dark?: boolean
  disabled?: boolean
}

export function ZoneBadge({ type, dark }: { type: ZoneOption['type']; dark?: boolean }) {
  const t = useTranslations('pickupAddress')
  const secteur = type === 'SECTEUR'
  return (
    <span style={{
      flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
      background: secteur ? (dark ? 'rgba(25,143,65,0.22)' : '#e8f5ed') : (dark ? 'rgba(59,130,246,0.22)' : '#e8effd'),
      color: secteur ? (dark ? '#4ade80' : '#137234') : (dark ? '#93c5fd' : '#1d4ed8'),
    }}>
      {t(`badge.${type}`)}
    </span>
  )
}

export default function ZoneCombobox({ id, value, onChange, error, dark, disabled }: Props) {
  const t       = useTranslations('pickupAddress')
  const locale  = useLocale()
  const autoId  = useId()
  const inputId = id ?? `zone-${autoId}`
  const listId  = `${inputId}-list`

  const [query,   setQuery]   = useState(value?.display_label ?? '')
  const [open,    setOpen]    = useState(false)
  const [options, setOptions] = useState<ZoneOption[]>([])
  const [active,  setActive]  = useState(-1)
  const [loading, setLoading] = useState(false)
  const [failed,  setFailed]  = useState(false)
  const [touched, setTouched] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  // A value set from outside (pre-fill) shows its label: adjust state while rendering
  const [shownId, setShownId] = useState<number | null>(value?.id ?? null)
  if ((value?.id ?? null) !== shownId) {
    setShownId(value?.id ?? null)
    if (value) setQuery(value.display_label)
  }
  const searchable = open && query.trim().length >= 2 && !(value && query.trim() === value.display_label)

  // Debounced search
  useEffect(() => {
    if (!searchable) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true); setFailed(false)
      searchZones(query.trim(), ctrl.signal)
        .then(list => { setOptions(list); setActive(list.length ? 0 : -1) })
        .catch(e => { if (e?.name !== 'AbortError') { setOptions([]); setFailed(true) } })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    }, 200)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [query, searchable])

  // Keep the highlighted option visible
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (zone: ZoneOption) => {
    onChange(zone)
    setQuery(zone.display_label)
    setOpen(false)
    setOptions([])
    setTouched(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive(i => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      if (open && options[active]) { e.preventDefault(); pick(options[active]) }
      else if (open) e.preventDefault()        // free text is never submitted
    } else if (e.key === 'Escape') {
      setOpen(false)
      if (value) setQuery(value.display_label)
    }
  }

  const clear = () => { onChange(null); setQuery(''); setOptions([]); setOpen(true) }

  const border  = error || (touched && !value && query.trim()) ? '#ef4444' : dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb'
  const surface = dark ? '#0D1117' : '#fff'
  const text    = dark ? '#fff' : '#1f2937'
  const muted   = dark ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const showList = searchable

  // Intigo labels are Latin script: the field and its list stay LTR in Arabic too
  return (
    <div style={{ position: 'relative' }}>
      <div dir="ltr" style={{ position: 'relative' }}>
        <Search size={15} aria-hidden style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none' }} />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          dir="ltr"
          placeholder={t('zonePlaceholder')}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setTouched(true) }, 150)}
          onKeyDown={onKeyDown}
          style={{
            width: '100%', paddingBlock: 11, paddingInlineStart: 38, paddingInlineEnd: value ? 118 : 38, borderRadius: 12, textOverflow: 'ellipsis', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            background: surface, color: text, border: `1.5px solid ${border}`,
          }}
        />
        {value ? (
          <span style={{ position: 'absolute', insetInlineEnd: 36, top: '50%', transform: 'translateY(-50%)' }}><ZoneBadge type={value.type} dark={dark} /></span>
        ) : null}
        {query && !disabled && (
          <button type="button" onClick={clear} aria-label={t('zoneClear')}
            style={{ position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {showList && (
        <ul id={listId} ref={listRef} role="listbox" aria-label={t('zone')} dir="ltr"
          style={{
            position: 'absolute', zIndex: 1000, insetInlineStart: 0, insetInlineEnd: 0, top: 'calc(100% + 4px)', margin: 0, padding: 4,
            listStyle: 'none', maxHeight: 280, overflowY: 'auto', borderRadius: 12, background: surface,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb'}`, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}>
          {loading && <li style={{ padding: '10px 12px', fontSize: 13, color: muted }}>{t('zoneLoading')}</li>}
          {!loading && failed && <li style={{ padding: '10px 12px', fontSize: 13, color: '#ef4444' }}>{t('zoneFailed')}</li>}
          {!loading && !failed && options.length === 0 && <li style={{ padding: '10px 12px', fontSize: 13, color: muted }}>{t('zoneNoResults')}</li>}
          {!loading && options.map((z, i) => (
            <li key={z.id} id={`${listId}-${i}`} data-index={i} role="option" aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(z) }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                background: i === active ? (dark ? 'rgba(219,20,46,0.18)' : '#fef2f2') : 'transparent',
              }}>
              <MapPin size={14} aria-hidden style={{ flexShrink: 0, color: i === active ? '#db142e' : muted }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span dir="ltr" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{z.display_label}</span>
                {locale === 'ar' && z.name_ar && <span dir="rtl" style={{ display: 'block', fontSize: 11, color: muted }}>{z.name_ar}</span>}
              </span>
              <ZoneBadge type={z.type} dark={dark} />
            </li>
          ))}
        </ul>
      )}

      {touched && !value && query.trim() !== '' && !open && !error && (
        <p role="alert" style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{t('zoneMustPick')}</p>
      )}
    </div>
  )
}
