'use client'

/**
 * app/seller/components/ColorGroupImageUploader.tsx
 *
 * Replaces VariantImageUploader.
 *
 * Instead of one upload zone per variant row (which caused duplicate uploads
 * for Red/S, Red/M, Red/L), this component shows ONE upload zone per unique
 * color group.
 *
 * A "color group" is the sorted set of color option IDs that appears in a
 * variant row. e.g. [3, 7] → key "3|7".
 * All size variants that share the same color group reuse the same images.
 *
 * Props:
 *   variantRows   — current VariantRow[] from VariantBuilder
 *   colorAxis     — the Attribute whose type === 'color' (null if none)
 *   onChange      — fires Record<string, File[]>  (groupKey → files)
 *                   groupKey is the sorted color option IDs joined by "|"
 *                   e.g. "3|7"
 *   existingByColorGroup — Record<groupKey, url[]> pre-filled from server
 *   disabled      — locks all controls while saving
 */

import { useEffect, useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import type { VariantRow } from './VariantBuilder'
import type { Attribute } from '@/types/Attributes'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES_PER_GROUP = 5

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorGroup {
  key: string                 // "3|7" — sorted color option IDs
  colorOptionIds: number[]    // [3, 7]
  label: string               // "Red + Blue"
  swatches: { id: number; value: string; color_hex?: string | null }[]
}

interface Slot {
  files: File[]
  previews: string[]
  existingUrls: string[]
}

interface Props {
  variantRows: VariantRow[]
  colorAxis: Attribute | null
  onChange: (map: Record<string, File[]>) => void
  existingByColorGroup?: Record<string, string[]>
  disabled?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the unique color groups from the current variant rows */
function extractColorGroups(
  variantRows: VariantRow[],
  colorAxis: Attribute | null
): ColorGroup[] {
  if (!colorAxis) return []

  const seen = new Map<string, ColorGroup>()

  for (const row of variantRows) {
    const colorIds = row.option_ids
      .filter(id => colorAxis.options.some(o => o.id === id))
      .sort((a, b) => a - b)

    if (colorIds.length === 0) continue

    const key = colorIds.join('|')
    if (seen.has(key)) continue

    const swatches = colorIds.map(id => {
      const opt = colorAxis.options.find(o => o.id === id)
      return { id, value: opt?.value ?? '?', color_hex: opt?.color_hex }
    })

    seen.set(key, {
      key,
      colorOptionIds: colorIds,
      label: swatches.map(s => s.value).join(' + '),
      swatches,
    })
  }

  return Array.from(seen.values())
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ColorGroupImageUploader({
  variantRows,
  colorAxis,
  onChange,
  existingByColorGroup = {},
  disabled = false,
}: Props) {
  const [groups,  setGroups]  = useState<ColorGroup[]>([])
  const [slots,   setSlots]   = useState<Record<string, Slot>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Recompute groups whenever variantRows change ───────────────────────────
  useEffect(() => {
    const nextGroups = extractColorGroups(variantRows, colorAxis)
    setGroups(nextGroups)

    setSlots(prev => {
      const next: Record<string, Slot> = {}

      for (const group of nextGroups) {
        if (prev[group.key]) {
          next[group.key] = prev[group.key]
        } else {
          next[group.key] = {
            files:        [],
            previews:     [],
            existingUrls: existingByColorGroup[group.key] ?? [],
          }
        }
      }

      // Revoke object URLs for groups that no longer exist
      for (const [key, slot] of Object.entries(prev)) {
        if (!next[key]) slot.previews.forEach(URL.revokeObjectURL)
      }

      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantRows, colorAxis, existingByColorGroup])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(slots).forEach(s => s.previews.forEach(URL.revokeObjectURL))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Notify parent ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map: Record<string, File[]> = {}
    for (const [key, slot] of Object.entries(slots)) {
      if (slot.files.length > 0) map[key] = slot.files
    }
    onChange(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  // ── File operations ───────────────────────────────────────────────────────

  const addFiles = (groupKey: string, incoming: File[]) => {
    setSlots(prev => {
      const slot = prev[groupKey]
      if (!slot) return prev

      const currentTotal = slot.existingUrls.length + slot.files.length
      const canAdd       = MAX_IMAGES_PER_GROUP - currentTotal
      if (canAdd <= 0) return prev

      const toAdd      = incoming.slice(0, canAdd)
      const newFiles   = [...slot.files, ...toAdd]
      const newPreviews = [...slot.previews, ...toAdd.map(f => URL.createObjectURL(f))]

      return { ...prev, [groupKey]: { ...slot, files: newFiles, previews: newPreviews } }
    })
  }

  const removeFile = (groupKey: string, fileIdx: number) => {
    setSlots(prev => {
      const slot = prev[groupKey]
      if (!slot) return prev

      URL.revokeObjectURL(slot.previews[fileIdx])

      return {
        ...prev,
        [groupKey]: {
          ...slot,
          files:    slot.files.filter((_, i) => i !== fileIdx),
          previews: slot.previews.filter((_, i) => i !== fileIdx),
        },
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (groups.length === 0) return null

  return (
    <div>
      {/* Section heading */}
      <p style={{
        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#94a3b8',
        paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
      }}>
        Images per Color Group
        <span style={{
          marginLeft: 8, fontSize: 9, fontWeight: 500,
          color: '#c4b5fd', textTransform: 'none', letterSpacing: 0,
        }}>
          shared across all sizes in that group
        </span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map((group, groupIdx) => {
          const slot = slots[group.key]
          if (!slot) return null

          const totalImgs = slot.existingUrls.length + slot.files.length
          const canAdd    = totalImgs < MAX_IMAGES_PER_GROUP

          return (
            <div key={group.key} style={{
              border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
            }}>

              {/* ── Group header ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
              }}>
                {/* Number badge */}
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: 'rgba(220,38,38,0.1)', color: '#dc2626',
                  border: '1px solid rgba(220,38,38,0.2)',
                  padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                }}>
                  #{groupIdx + 1}
                </span>

                {/* Color swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {group.swatches.map(s => (
                    <span
                      key={s.id}
                      title={s.value}
                      style={{
                        display: 'inline-block', width: 16, height: 16,
                        borderRadius: '50%', flexShrink: 0,
                        background: s.color_hex ?? '#e5e7eb',
                        border: '1.5px solid rgba(0,0,0,0.12)',
                      }}
                    />
                  ))}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#374151', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {group.label}
                </span>

                {/* Counter */}
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {totalImgs}/{MAX_IMAGES_PER_GROUP}
                </span>
              </div>

              <div style={{ padding: '12px 14px' }}>

                {/* ── Existing server images (read-only) ── */}
                {slot.existingUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {slot.existingUrls.map((url, i) => (
                      <div key={i} style={{
                        position: 'relative', width: 64, height: 64,
                        borderRadius: 8, overflow: 'hidden',
                        border: '1px solid #e5e7eb', flexShrink: 0,
                      }}>
                        <img
                          src={url} alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute', top: 2, right: 2,
                          background: 'rgba(0,0,0,0.5)', borderRadius: 4,
                          padding: '1px 4px', fontSize: 8,
                          color: '#fff', fontWeight: 700,
                        }}>
                          saved
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── New file previews ── */}
                {slot.files.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {slot.previews.map((preview, fi) => (
                      <div key={fi} style={{
                        position: 'relative', width: 64, height: 64,
                        borderRadius: 8, overflow: 'hidden',
                        border: '1px solid #e5e7eb', flexShrink: 0,
                      }}>
                        <img
                          src={preview} alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeFile(group.key, fi)}
                          style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.9)', border: 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', padding: 0,
                          }}
                        >
                          <X size={9} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Upload drop zone ── */}
                {canAdd && (
                  <div
                    onClick={() => !disabled && inputRefs.current[group.key]?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      addFiles(
                        group.key,
                        Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                      )
                    }}
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: '#fafafa',
                    }}
                  >
                    <Upload size={14} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                      Upload images for <strong>{group.label}</strong>
                    </span>
                    <input
                      ref={el => { inputRefs.current[group.key] = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={disabled}
                      onChange={e => {
                        addFiles(group.key, Array.from(e.target.files ?? []))
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}

                {/* ── Empty state ── */}
                {totalImgs === 0 && (
                  <p style={{
                    fontSize: 11, color: '#c0c0c0', margin: '6px 0 0',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <ImageIcon size={10} /> No images for this color group yet
                  </p>
                )}

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}