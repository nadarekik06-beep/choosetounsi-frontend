'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

const RED = '#db142e'
export const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Proof photos of the returned item(s): at least one is required (the slip
 * prints them for the courier's check), up to five, 5 MB each.
 */
export default function ProofPhotosInput({
  files, onChange, error, onError,
}: {
  files:    File[]
  onChange: (files: File[]) => void
  error?:   string
  onError?: (message: string | null) => void
}) {
  const t = useTranslations('returns.form')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  const add = (list: FileList | null) => {
    if (!list) return
    const next = [...files]
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) { onError?.(t('photoType')); continue }
      if (f.size > MAX_BYTES)          { onError?.(t('photoSize')); continue }
      if (next.length >= MAX_PHOTOS)   { onError?.(t('photoMax', { count: MAX_PHOTOS })); break }
      next.push(f)
    }
    onChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginBottom: 8 }}>
          {previews.map((src, i) => (
            <div key={src} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb', aspectRatio: '1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t('photoN', { n: i + 1 })} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={t('removePhoto')}
                style={{
                  position: 'absolute', top: 4, insetInlineEnd: 4, width: 22, height: 22, borderRadius: 6,
                  border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {files.length < MAX_PHOTOS && (
        <div
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
          style={{
            border: `2px dashed ${error ? RED : dragging ? RED : '#cbd5e1'}`, borderRadius: 10,
            padding: files.length ? '12px' : '22px 16px', textAlign: 'center', cursor: 'pointer',
            background: error || dragging ? 'rgba(219,20,46,0.03)' : '#f8fafc', transition: 'all 0.15s',
          }}>
          <div style={{ fontSize: files.length ? 18 : 28, marginBottom: 4 }}>📷</div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', margin: 0 }}>
            {files.length ? t('addPhoto') : t.rich('dropPhotos', { b: c => <span style={{ color: RED }}>{c}</span> })}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{t('photosHint', { count: MAX_PHOTOS })}</p>
        </div>
      )}
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp"
        style={{ display: 'none' }} onChange={e => add(e.target.files)} />
      {error && <span style={{ fontSize: 11, color: RED, fontWeight: 700, marginTop: 6, display: 'block' }}>⚠ {error}</span>}
    </div>
  )
}
