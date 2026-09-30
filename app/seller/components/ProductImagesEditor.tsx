'use client'

/**
 * ProductImagesEditor — the single place where a seller manages product images.
 *
 *   Product with a color attribute → one card per color group (shared by every
 *     size of that color, like Amazon / Trendyol). First image = the color's main image.
 *   Product without color (sizes only, or no variants) → one "Product images" gallery.
 *
 * Nothing is uploaded here: add / delete / replace / reorder are applied when the
 * product form is saved (see buildImageManifest). There are no per-size images.
 */

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, GripVertical, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ─── Model ──────────────────────────────────────────────────────────────────

export type ImgItem =
  | { uid: string; kind: 'existing'; id: number; url: string }
  | { uid: string; kind: 'new'; file: File; url: string; replaces?: number }

export interface ImagesState {
  gallery: ImgItem[]
  /** color group key ("5|7") → images, first = main image of that color */
  colors: Record<string, ImgItem[]>
}

export interface ColorGroupDef {
  key: string
  swatches: { id: number; value: string; color_hex?: string | null }[]
}

export const GALLERY_MAX = 8
export const GROUP_MAX = 5
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

let seq = 0
const uid = () => `img${Date.now().toString(36)}${(seq++).toString(36)}`
const newItem = (file: File, replaces?: number): ImgItem => ({ uid: uid(), kind: 'new', file, url: URL.createObjectURL(file), replaces })

/** State from the seller product API's `image_sets`. */
export function imagesFromServer(sets?: { gallery?: { id: number; url: string }[]; color_groups?: { key: string; images: { id: number; url: string }[] }[] } | null): ImagesState {
  const existing = (i: { id: number; url: string }): ImgItem => ({ uid: `e${i.id}`, kind: 'existing', id: i.id, url: i.url })
  return {
    gallery: (sets?.gallery ?? []).map(existing),
    colors: Object.fromEntries((sets?.color_groups ?? []).map(g => [g.key, g.images.map(existing)])),
  }
}

/**
 * What the backend saves (ProductImages manifest) + the files it references.
 * Color products keep only the groups still used by a variant; removed colors' images are dropped.
 */
export function buildImageManifest(state: ImagesState, groupKeys: string[] | null) {
  const uploads: Record<string, File> = {}
  const items = (list: ImgItem[]) => list.map(i => {
    if (i.kind === 'existing') return { id: i.id }
    uploads[i.uid] = i.file
    return i.replaces ? { upload: i.uid, replaces: i.replaces } : { upload: i.uid }
  })
  const manifest = {
    gallery: items(state.gallery),
    color_groups: (groupKeys ?? []).map(key => ({
      color_option_ids: key.split('|').map(Number),
      items: items(state.colors[key] ?? []),
    })),
  }
  return { image_manifest: JSON.stringify(manifest), uploads }
}

/** Color groups that have images but no variant anymore (images deleted on save). */
export function removedColorKeys(state: ImagesState, groupKeys: string[] | null): string[] {
  if (!groupKeys) return Object.keys(state.colors).filter(k => state.colors[k].length > 0)
  return Object.keys(state.colors).filter(k => state.colors[k].length > 0 && !groupKeys.includes(k))
}

export function revokeImages(state: ImagesState) {
  ;[...state.gallery, ...Object.values(state.colors).flat()].forEach(i => { if (i.kind === 'new') URL.revokeObjectURL(i.url) })
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  /** null → the product has no color attribute: single gallery */
  groups: ColorGroupDef[] | null
  value: ImagesState
  onChange: (next: ImagesState) => void
  /** Labels of colors removed from the variants whose images will be deleted */
  removed: { key: string; label: string; count: number }[]
  errors?: Record<string, string>
  disabled?: boolean
}

export default function ProductImagesEditor({ groups, value, onChange, removed, errors = {}, disabled }: Props) {
  const t = useTranslations('seller.images')
  const setGallery = (gallery: ImgItem[]) => onChange({ ...value, gallery })
  const setColor = (key: string, list: ImgItem[]) => onChange({ ...value, colors: { ...value.colors, [key]: list } })

  // No color attribute: sizes only, or no variants at all
  if (groups === null) {
    return (
      <ImageSet
        title={t('productImages')}
        hint={t('productImagesHint')}
        items={value.gallery} onChange={setGallery} max={GALLERY_MAX}
        error={errors['images.gallery']} disabled={disabled}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{t('perColorHint')}</p>

      {groups.length === 0 && (
        <div style={{ border: '1.5px dashed #e2e8f0', borderRadius: 14, padding: 18, textAlign: 'center', fontSize: 12.5, color: '#5b6472' }}>
          {t('noColorsYet')}
        </div>
      )}

      {groups.map(g => {
        const items = value.colors[g.key] ?? []
        return (
          <ImageSet
            key={g.key}
            title={g.swatches.map(s => s.value).join(' + ')}
            swatches={g.swatches}
            hint={t('sharedAcrossSizes')}
            items={items} onChange={list => setColor(g.key, list)} max={GROUP_MAX}
            warning={items.length === 0 ? t('colorNeedsImage') : undefined}
            error={errors[`images.color.${g.key}`]} disabled={disabled}
          />
        )
      })}

      {removed.map(r => (
        <div key={r.key} role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '10px 14px' }}>
          <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>{t('removedColor', { color: r.label, count: r.count })}</p>
        </div>
      ))}

      {/* General images saved before color groups existed: still shown before a color is chosen */}
      {value.gallery.length > 0 && (
        <ImageSet
          title={t('generalImages')} hint={t('generalImagesHint')}
          items={value.gallery} onChange={setGallery} max={GALLERY_MAX} allowAdd={false}
          error={errors['images.gallery']} disabled={disabled}
        />
      )}
    </div>
  )
}

// ─── One image set (a color group or the gallery) ───────────────────────────

function ImageSet({ title, hint, swatches, items, onChange, max, warning, error, disabled, allowAdd = true }: {
  title: string
  hint?: string
  swatches?: ColorGroupDef['swatches']
  items: ImgItem[]
  onChange: (items: ImgItem[]) => void
  max: number
  warning?: string
  error?: string
  disabled?: boolean
  allowAdd?: boolean
}) {
  const t = useTranslations('seller.images')
  const addRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceIdx = useRef<number | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [fileOver, setFileOver] = useState(false)
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(id)
  }, [notice])
  useEffect(() => {
    if (confirmIdx === null) return
    const id = setTimeout(() => setConfirmIdx(null), 3500)
    return () => clearTimeout(id)
  }, [confirmIdx])

  const check = (f: File): string | null => {
    if (!ACCEPT.split(',').includes(f.type) && !/\.(jpe?g|png|webp|gif)$/i.test(f.name)) return t('fileType', { name: f.name })
    if (f.size > MAX_BYTES) return t('fileSize', { name: f.name })
    return null
  }

  const add = (files: File[]) => {
    const room = max - items.length
    const ok: ImgItem[] = []
    let problem: string | null = null
    for (const f of files) {
      const err = check(f)
      if (err) { problem ??= err; continue }
      if (ok.length >= room) { problem ??= t('tooMany', { max }); break }
      ok.push(newItem(f))
    }
    if (ok.length) onChange([...items, ...ok])
    if (problem) setNotice(problem)
  }

  const replace = (i: number, f: File) => {
    const err = check(f)
    if (err) { setNotice(err); return }
    const old = items[i]
    if (old.kind === 'new') URL.revokeObjectURL(old.url)
    const next = [...items]
    next[i] = newItem(f, old.kind === 'existing' ? old.id : old.replaces)
    onChange(next)
  }

  const remove = (i: number) => {
    const old = items[i]
    if (old.kind === 'new') URL.revokeObjectURL(old.url)
    onChange(items.filter((_, j) => j !== i))
    setConfirmIdx(null)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const next = [...items]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }

  const full = items.length >= max
  const border = error ? '#fca5a5' : warning ? '#fcd34d' : '#e5e7eb'

  return (
    <div style={{ border: `1.5px solid ${border}`, borderRadius: 16, padding: 14, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {swatches && (
          <span style={{ display: 'inline-flex' }}>
            {swatches.map((s, i) => (
              <span key={s.id} title={s.value} style={{
                width: 16, height: 16, borderRadius: '50%', background: s.color_hex ?? '#e5e7eb',
                border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)', marginInlineStart: i ? -5 : 0,
              }} />
            ))}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</span>
        <span style={{
          marginInlineStart: 'auto', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
          background: full ? 'rgba(219,20,46,0.08)' : '#f1f5f9', color: full ? '#db142e' : '#64748b',
        }}>{items.length}/{max}</span>
      </div>
      {hint && <p style={{ fontSize: 11, color: '#5b6472', margin: '-4px 0 10px' }}>{hint}</p>}

      <div
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setFileOver(true) } }}
        onDragLeave={() => setFileOver(false)}
        onDrop={e => { if (e.dataTransfer.files?.length && allowAdd) { e.preventDefault(); setFileOver(false); add(Array.from(e.dataTransfer.files)) } }}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 10,
          borderRadius: 12, padding: 4, margin: -4,
          outline: fileOver ? '2px dashed #198f41' : 'none', background: fileOver ? 'rgba(25,143,65,0.05)' : 'transparent',
        }}
      >
        {items.map((it, i) => (
          <div
            key={it.uid}
            draggable={!disabled}
            onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={e => { if (dragFrom !== null) { e.preventDefault(); setDragOver(i) } }}
            onDragLeave={() => setDragOver(v => (v === i ? null : v))}
            onDrop={e => { if (dragFrom !== null) { e.preventDefault(); e.stopPropagation(); move(dragFrom, i) } setDragFrom(null); setDragOver(null) }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null) }}
            className="pie-tile"
            style={{
              position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#f8fafc',
              border: i === 0 ? '2.5px solid #db142e' : '1.5px solid #e5e7eb',
              opacity: dragFrom === i ? 0.4 : 1, cursor: disabled ? 'default' : 'grab',
              boxShadow: dragOver === i && dragFrom !== i ? '0 0 0 3px #198f41' : 'none', transition: 'box-shadow 0.15s',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: 6, insetInlineStart: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {i === 0 && <Tag bg="#db142e">{t('primary')}</Tag>}
              {it.kind === 'new' && <Tag bg="#198f41">{it.replaces ? t('replacedTag') : t('newTag')}</Tag>}
            </div>
            <GripVertical size={14} color="#fff" style={{ position: 'absolute', top: 7, insetInlineEnd: 5, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }} />

            <div className="pie-actions" style={{
              position: 'absolute', insetInline: 0, bottom: 0, display: 'flex', justifyContent: 'center', gap: 2,
              padding: '5px 4px', background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
            }}>
              {confirmIdx === i ? (
                <button type="button" onClick={() => remove(i)} style={{ ...btn, background: '#db142e', padding: '4px 10px', fontSize: 11, fontWeight: 800, width: 'auto' }}>
                  {t('confirmDelete')}
                </button>
              ) : (
                <>
                  <IconBtn label={t('moveLeft')} onClick={() => move(i, i - 1)} disabled={disabled || i === 0}><ArrowLeft size={13} className="rtl-flip" /></IconBtn>
                  <IconBtn label={t('replace')} onClick={() => { replaceIdx.current = i; replaceRef.current?.click() }} disabled={disabled}><RefreshCw size={13} /></IconBtn>
                  <IconBtn label={t('remove')} onClick={() => setConfirmIdx(i)} disabled={disabled}><Trash2 size={13} /></IconBtn>
                  <IconBtn label={t('moveRight')} onClick={() => move(i, i + 1)} disabled={disabled || i === items.length - 1}><ArrowRight size={13} className="rtl-flip" /></IconBtn>
                </>
              )}
            </div>
          </div>
        ))}

        {allowAdd && !full && (
          <button
            type="button" disabled={disabled} onClick={() => addRef.current?.click()}
            style={{
              aspectRatio: '1', borderRadius: 12, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', padding: 6,
            }}
          >
            <ImagePlus size={20} />
            <span style={{ fontSize: 11.5, fontWeight: 800 }}>{t('addImages')}</span>
            <span style={{ fontSize: 10, color: '#5b6472', textAlign: 'center' }}>{t('dropHint')}</span>
          </button>
        )}
      </div>

      {items.length > 1 && <p style={{ fontSize: 10.5, color: '#5b6472', margin: '8px 0 0' }}>{t('reorderHint')}</p>}
      {(error || notice || warning) && (
        <p role={error ? 'alert' : undefined} style={{ fontSize: 11.5, fontWeight: 600, margin: '8px 0 0', color: error || notice ? '#dc2626' : '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertTriangle size={12} /> {error || notice || warning}
        </p>
      )}

      <input ref={addRef} type="file" accept={ACCEPT} multiple hidden onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <input ref={replaceRef} type="file" accept={ACCEPT} hidden onChange={e => {
        const f = e.target.files?.[0]
        if (f && replaceIdx.current !== null) replace(replaceIdx.current, f)
        replaceIdx.current = null
        e.target.value = ''
      }} />
      <style>{`
        @media (hover: hover) { .pie-tile .pie-actions { opacity: 0; transition: opacity .15s } .pie-tile:hover .pie-actions, .pie-tile:focus-within .pie-actions { opacity: 1 } }
        [dir="rtl"] .rtl-flip { transform: scaleX(-1) }
      `}</style>
    </div>
  )
}

const btn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit',
}

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      style={{ ...btn, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  )
}

function Tag({ children, bg }: { children: React.ReactNode; bg: string }) {
  return <span style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', background: bg, padding: '2px 7px', borderRadius: 999 }}>{children}</span>
}
