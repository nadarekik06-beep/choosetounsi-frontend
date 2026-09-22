'use client'

/**
 * app/seller/components/VariantImageUploader.tsx
 *
 * Replaces ColorImageUploader in ProductModal.
 *
 * One upload zone per variant row.
 * Images keyed by variant INDEX (0-based), matching the variants[] array
 * sent to the backend as color_images[{variantIndex}][j].
 *
 * Props:
 *   variantRows       — current VariantRow[] from VariantBuilder
 *   axes              — full Attribute[] so we can render a readable label
 *   onChange          — fires Record<number, File[]>  (variantIndex → files)
 *   existingByVariant — Record<variantId, url[]> from server (read-only thumbnails)
 *   disabled          — locks all controls while saving
 *
 * Backward compat:
 *   Existing variant images loaded from the server are shown as read-only.
 *   Uploading NEW files for a variant replaces them on save (backend deletes old).
 *   Variants with no new uploads keep their existing images untouched.
 */

import { useEffect, useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import type { VariantRow } from './VariantBuilder'
import type { Attribute } from '@/types/Attributes'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES_PER_VARIANT = 5

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Current variant rows from VariantBuilder */
  variantRows: VariantRow[]
  /** All variant axes — used to build human-readable labels */
  axes: Attribute[]
  /**
   * Called whenever uploads change.
   * map: variantIndex (0-based) → File[]
   * This maps to color_images[{variantIndex}][j] in FormData.
   */
  onChange: (map: Record<number, File[]>) => void
  /**
   * Existing server images by variant DB id (not index).
   * Record<variantId, url[]>
   * Built in ProductModal from p?.images filtered by variant_id.
   */
  existingByVariant?: Record<number, string[]>
  disabled?: boolean
}

interface Slot {
  files: File[]
  previews: string[]    // object URLs for new files
  existingUrls: string[] // URLs already on the server (read-only)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a human-readable label for a variant row.
 * Walks all axis options and collects those whose ID appears in option_ids.
 * Works for both single-color (old) and multi-color (new) variants.
 */
function variantLabel(row: VariantRow, axes: Attribute[]): string {
  if (!row.option_ids.length) return 'New variant (no options selected yet)'
  const parts: string[] = []
  for (const axis of axes) {
    for (const opt of axis.options) {
      if (row.option_ids.includes(opt.id)) {
        parts.push(opt.value)
      }
    }
  }
  return parts.length ? parts.join(' / ') : `Variant`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantImageUploader({
  variantRows,
  axes,
  onChange,
  existingByVariant = {},
  disabled = false,
}: Props) {
  const [slots, setSlots] = useState<Record<number, Slot>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // ── Sync slots when variantRows changes ───────────────────────────────────
  // Rules:
  //   - Keep existing slot data when a row stays at the same index
  //   - Create a new empty slot for a newly added row
  //   - Revoke object URLs for removed rows to avoid memory leaks
  useEffect(() => {
    setSlots(prev => {
      const next: Record<number, Slot> = {}

      variantRows.forEach((row, idx) => {
        if (prev[idx]) {
          // Preserve existing slot (files, previews) across re-renders
          next[idx] = prev[idx]
        } else {
          // New row — look up any already-saved images by variant DB id
          const existingUrls = row.id ? (existingByVariant[row.id] ?? []) : []
          next[idx] = { files: [], previews: [], existingUrls }
        }
      })

      // Revoke object URLs for slots that no longer exist (row was deleted)
      for (const [idxStr, slot] of Object.entries(prev)) {
        const idx = Number(idxStr)
        if (!next[idx]) {
          slot.previews.forEach(URL.revokeObjectURL)
        }
      }

      return next
    })
  // Depend on row count + row ids so this runs when rows are added/removed
  // but NOT on every keystroke inside a row (stock, price, etc.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantRows.length, variantRows.map(r => r.id ?? 'new').join(','), existingByVariant])

  // ── Cleanup object URLs on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(slots).forEach(s => s.previews.forEach(URL.revokeObjectURL))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Notify parent after every slots change ────────────────────────────────
  useEffect(() => {
    const map: Record<number, File[]> = {}
    for (const [idxStr, slot] of Object.entries(slots)) {
      if (slot.files.length > 0) {
        map[Number(idxStr)] = slot.files
      }
    }
    onChange(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  // ── File operations ───────────────────────────────────────────────────────

  const addFiles = (variantIdx: number, incoming: File[]) => {
    setSlots(prev => {
      const slot = prev[variantIdx]
      if (!slot) return prev

      const currentTotal = slot.existingUrls.length + slot.files.length
      const canAdd       = MAX_IMAGES_PER_VARIANT - currentTotal
      if (canAdd <= 0) return prev

      const toAdd      = incoming.slice(0, canAdd)
      const newFiles   = [...slot.files, ...toAdd]
      const newPreviews = [...slot.previews, ...toAdd.map(f => URL.createObjectURL(f))]

      return { ...prev, [variantIdx]: { ...slot, files: newFiles, previews: newPreviews } }
    })
  }

  const removeFile = (variantIdx: number, fileIdx: number) => {
    setSlots(prev => {
      const slot = prev[variantIdx]
      if (!slot) return prev

      URL.revokeObjectURL(slot.previews[fileIdx])

      return {
        ...prev,
        [variantIdx]: {
          ...slot,
          files:    slot.files.filter((_, i) => i !== fileIdx),
          previews: slot.previews.filter((_, i) => i !== fileIdx),
        },
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (variantRows.length === 0) return null

  return (
    <div>
      {/* Section heading */}
      <p style={{
        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#94a3b8',
        paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
      }}>
        Images per Variant
        <span style={{
          marginLeft: 8, fontSize: 9, fontWeight: 500,
          color: '#c4b5fd', textTransform: 'none', letterSpacing: 0,
        }}>
          each variant has its own gallery
        </span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {variantRows.map((row, idx) => {
          const slot = slots[idx]
          if (!slot) return null

          const label     = variantLabel(row, axes)
          const totalImgs = slot.existingUrls.length + slot.files.length
          const canAdd    = totalImgs < MAX_IMAGES_PER_VARIANT

          return (
            <div key={idx} style={{
              border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
            }}>

              {/* ── Variant header ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                  border: '1px solid rgba(99,102,241,0.2)',
                  padding: '2px 7px', borderRadius: 4,
                }}>
                  #{idx + 1}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#374151', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {totalImgs}/{MAX_IMAGES_PER_VARIANT}
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
                          onClick={() => removeFile(idx, fi)}
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
                    onClick={() => !disabled && inputRefs.current[idx]?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      addFiles(
                        idx,
                        Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                      )
                    }}
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: '#fafafa', transition: 'border-color 0.15s',
                    }}
                    className="hover:border-red-300"
                  >
                    <Upload size={14} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                      Upload images for <strong>variant #{idx + 1}</strong>
                    </span>
                    <input
                      ref={el => { inputRefs.current[idx] = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={disabled}
                      onChange={e => {
                        addFiles(idx, Array.from(e.target.files ?? []))
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
                    <ImageIcon size={10} /> No images for this variant yet
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