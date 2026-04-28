'use client'

/**
 * app/seller/components/VariantImageManager.tsx
 *
 * Used exclusively in EDIT mode (ProductModal when isEdit=true).
 *
 * For each variant row supplied by the server it shows:
 *   1. Existing images already stored on S3/storage — each has a DELETE button
 *   2. A drop-zone to upload brand-new images for that variant
 *
 * onChange fires two separate maps every time anything changes:
 *   newImagesByVariantId   — Record<variantId, File[]>   new files to upload
 *   deleteImageIds         — number[]                    IDs to delete on save
 *
 * These are wired directly into the ProductModal's handleSubmit:
 *   - new files go into FormData as  variant_images[{variantId}][j]
 *   - deleted IDs go into            delete_image_ids[j]
 *
 * The component is read-only when disabled=true (while saving).
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Upload, X, Trash2, Image as ImageIcon, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantForImageManager {
  /** DB id — present for all existing variants */
  id: number
  /** Pre-built human-readable label from the server e.g. "Red+Blue / M" */
  label: string
  /** option_map keyed by attribute slug — used to render color swatches */
  option_map?: Record<string, {
    id: number
    ids?: number[]
    value: string
    color_hex?: string | null
  }>
  /** Full image URLs already saved on the server */
  image_urls?: string[]
  /** Raw DB image rows so we can track IDs for deletion */
  existing_images?: Array<{
    id: number
    url: string
    is_primary?: boolean
  }>
}

interface Props {
  variants: VariantForImageManager[]
  /** Called whenever uploads or deletions change */
  onChange: (params: {
    newImagesByVariantId: Record<number, File[]>
    deleteImageIds: number[]
  }) => void
  disabled?: boolean
}

// ─── Internal slot state ──────────────────────────────────────────────────────

interface ImageSlot {
  /** Existing images still kept (not yet marked for deletion) */
  kept: Array<{ id: number; url: string; is_primary?: boolean }>
  /** IDs the user has flagged for deletion */
  toDelete: number[]
  /** New files queued for upload */
  newFiles: File[]
  /** Object URLs for preview (parallel to newFiles) */
  newPreviews: string[]
}

const MAX_PER_VARIANT = 6

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialSlot(v: VariantForImageManager): ImageSlot {
  // Prefer existing_images (has IDs) over image_urls (strings only)
  const kept = (v.existing_images ?? []).map(img => ({
    id:         img.id,
    url:        img.url,
    is_primary: img.is_primary,
  }))

  // If existing_images wasn't provided but image_urls was, show them as
  // read-only (no delete capability since we don't have the DB id)
  const readOnly = kept.length === 0 && (v.image_urls ?? []).length > 0

  return {
    kept:        readOnly ? [] : kept,   // only kept when we have IDs
    toDelete:    [],
    newFiles:    [],
    newPreviews: [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VariantImageManager({
  variants,
  onChange,
  disabled = false,
}: Props) {
  const [slots, setSlots] = useState<Record<number, ImageSlot>>(() => {
    const init: Record<number, ImageSlot> = {}
    variants.forEach(v => { init[v.id] = buildInitialSlot(v) })
    return init
  })

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // ── Cleanup object URLs on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(slots).forEach(s =>
        s.newPreviews.forEach(URL.revokeObjectURL)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Notify parent whenever slots change ───────────────────────────────────
  useEffect(() => {
    const newImagesByVariantId: Record<number, File[]> = {}
    const deleteImageIds: number[] = []

    for (const [idStr, slot] of Object.entries(slots)) {
      const id = Number(idStr)
      if (slot.newFiles.length > 0)  newImagesByVariantId[id] = slot.newFiles
      deleteImageIds.push(...slot.toDelete)
    }

    onChange({ newImagesByVariantId, deleteImageIds })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  // ── Mark an existing image for deletion ───────────────────────────────────
  const markDelete = useCallback((variantId: number, imageId: number) => {
    setSlots(prev => {
      const slot = prev[variantId]
      if (!slot) return prev
      return {
        ...prev,
        [variantId]: {
          ...slot,
          kept:     slot.kept.filter(img => img.id !== imageId),
          toDelete: [...slot.toDelete, imageId],
        },
      }
    })
  }, [])

  // ── Undo a pending deletion ───────────────────────────────────────────────
const undoDelete = useCallback((variantId: number, imageId: number, img: { id: number; url: string; is_primary?: boolean }) => {
    setSlots(prev => {
      const slot = prev[variantId]
      if (!slot) return prev
      return {
        ...prev,
        [variantId]: {
          ...slot,
          kept:     [...slot.kept, img],
          toDelete: slot.toDelete.filter(id => id !== imageId),
        },
      }
    })
  }, [])

  // ── Add new files ─────────────────────────────────────────────────────────
  const addFiles = useCallback((variantId: number, incoming: File[]) => {
    setSlots(prev => {
      const slot = prev[variantId]
      if (!slot) return prev

      const currentTotal = slot.kept.length + slot.newFiles.length
      const canAdd       = MAX_PER_VARIANT - currentTotal
      if (canAdd <= 0) return prev

      const toAdd      = incoming.filter(f => f.type.startsWith('image/')).slice(0, canAdd)
      const newFiles   = [...slot.newFiles, ...toAdd]
      const newPreviews = [
        ...slot.newPreviews,
        ...toAdd.map(f => URL.createObjectURL(f)),
      ]

      return { ...prev, [variantId]: { ...slot, newFiles, newPreviews } }
    })
  }, [])

  // ── Remove a new (not yet uploaded) file ──────────────────────────────────
  const removeNew = useCallback((variantId: number, fileIdx: number) => {
    setSlots(prev => {
      const slot = prev[variantId]
      if (!slot) return prev

      URL.revokeObjectURL(slot.newPreviews[fileIdx])

      return {
        ...prev,
        [variantId]: {
          ...slot,
          newFiles:    slot.newFiles.filter((_, i) => i !== fileIdx),
          newPreviews: slot.newPreviews.filter((_, i) => i !== fileIdx),
        },
      }
    })
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (variants.length === 0) return null

  return (
    <div>
      {/* Section heading */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 10, borderBottom: '1px solid #f0f0f0', marginBottom: 16,
      }}>
        <p style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#94a3b8', margin: 0,
        }}>
          Variant Images
        </p>
        <span style={{
          fontSize: 9, fontWeight: 600, color: '#10b981',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          padding: '1px 6px', borderRadius: 4,
        }}>
          ✓ Instant — no approval needed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {variants.map(variant => {
          const slot = slots[variant.id]
          if (!slot) return null

          const colorEntry = variant.option_map?.['color']
          const totalShown = slot.kept.length + slot.newFiles.length
          const canAdd     = totalShown < MAX_PER_VARIANT
          const pendingDel = slot.toDelete.length

          return (
            <div
              key={variant.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* ── Variant header ── */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
              }}>
                {/* Color swatches */}
                {colorEntry && (
                  <span style={{ display: 'inline-flex', gap: 3, flexShrink: 0 }}>
                    {colorEntry.ids
                      ? colorEntry.ids.map((id, i) => (
                          <span key={id} title={colorEntry.value} style={{
                            display: 'inline-block', width: 14, height: 14,
                            borderRadius: '50%',
                            background: i === 0 ? (colorEntry.color_hex ?? '#e5e7eb') : '#e5e7eb',
                            border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0,
                          }} />
                        ))
                      : (
                          <span style={{
                            display: 'inline-block', width: 14, height: 14,
                            borderRadius: '50%',
                            background: colorEntry.color_hex ?? '#e5e7eb',
                            border: '1.5px solid rgba(0,0,0,0.12)',
                          }} />
                        )
                    }
                  </span>
                )}

                {/* Label */}
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#374151', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {variant.label || `Variant #${variant.id}`}
                </span>

                {/* Count / deletion badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {pendingDel > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      color: '#ef4444', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {pendingDel} to delete
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {totalShown}/{MAX_PER_VARIANT}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px 14px' }}>

                {/* ── Kept existing images ── */}
                {slot.kept.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{
                      fontSize: 10, color: '#94a3b8', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                    }}>
                      Saved
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {slot.kept.map(img => (
                        <div key={img.id} style={{
                          position: 'relative', width: 64, height: 64,
                          borderRadius: 8, overflow: 'hidden',
                          border: '1.5px solid #e5e7eb', flexShrink: 0,
                        }} className="group">
                          <img
                            src={img.url} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {img.is_primary && (
                            <div style={{
                              position: 'absolute', bottom: 2, left: 2,
                              background: 'rgba(220,38,38,0.85)', borderRadius: 3,
                              padding: '1px 4px', fontSize: 7, color: '#fff', fontWeight: 800,
                            }}>
                              Primary
                            </div>
                          )}
                          {/* Delete overlay */}
                          {!disabled && (
                            <button
                              type="button"
                              onClick={() => markDelete(variant.id, img.id)}
                              title="Remove this image"
                              style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(239,68,68,0)',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.7)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0)')}
                            >
                              <Trash2 size={16} color="#fff" style={{ opacity: 0, transition: 'opacity 0.15s' }}
                                onMouseEnter={e => ((e.currentTarget as SVGElement).style.opacity = '1')}
                              />
                            </button>
                          )}
                          {/* Always-visible delete badge */}
                          {!disabled && (
                            <button
                              type="button"
                              onClick={() => markDelete(variant.id, img.id)}
                              title="Remove"
                              style={{
                                position: 'absolute', top: 3, right: 3,
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.9)', border: 'none',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0,
                              }}
                            >
                              <X size={10} color="#fff" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Pending deletions (undo available) ── */}
                {slot.toDelete.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{
                      fontSize: 10, color: '#ef4444', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                    }}>
                      Marked for deletion
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {slot.toDelete.map(imgId => {
                        // Find the original image data to show a preview
                        const original = (variant.existing_images ?? []).find(i => i.id === imgId)
                        return (
                          <div key={imgId} style={{
                            position: 'relative', width: 64, height: 64,
                            borderRadius: 8, overflow: 'hidden',
                            border: '2px solid rgba(239,68,68,0.5)', flexShrink: 0,
                            opacity: 0.5,
                          }}>
                            {original && (
                              <img
                                src={original.url} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(239,68,68,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Trash2 size={18} color="#ef4444" />
                            </div>
                            {/* Undo button */}
                            {!disabled && original && (
                              <button
                                type="button"
                                onClick={() => undoDelete(variant.id, imgId, { id: imgId, url: original.url, is_primary: original.is_primary })}
                                title="Undo"
                                style={{
                                  position: 'absolute', top: 2, right: 2,
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: 'rgba(16,185,129,0.9)', border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: 0,
                                }}
                              >
                                <Check size={10} color="#fff" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── New uploads preview ── */}
                {slot.newFiles.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{
                      fontSize: 10, color: '#6366f1', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                    }}>
                      New (will upload on save)
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {slot.newPreviews.map((preview, fi) => (
                        <div key={fi} style={{
                          position: 'relative', width: 64, height: 64,
                          borderRadius: 8, overflow: 'hidden',
                          border: '2px solid rgba(99,102,241,0.4)', flexShrink: 0,
                        }}>
                          <img
                            src={preview} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {!disabled && (
                            <button
                              type="button"
                              onClick={() => removeNew(variant.id, fi)}
                              style={{
                                position: 'absolute', top: 2, right: 2,
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.9)', border: 'none',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 0,
                              }}
                            >
                              <X size={10} color="#fff" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Upload drop zone ── */}
                {canAdd && (
                  <div
                    onClick={() => !disabled && inputRefs.current[variant.id]?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      addFiles(variant.id, Array.from(e.dataTransfer.files))
                    }}
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: '#fafafa', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = '#6366f1' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db' }}
                  >
                    <Upload size={13} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                      Add images
                      <span style={{ color: '#94a3b8', marginLeft: 4, fontWeight: 400 }}>
                        ({MAX_PER_VARIANT - totalShown} remaining)
                      </span>
                    </span>
                    <input
                      ref={el => { inputRefs.current[variant.id] = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={disabled}
                      onChange={e => {
                        addFiles(variant.id, Array.from(e.target.files ?? []))
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}

                {/* ── Empty state ── */}
                {totalShown === 0 && slot.toDelete.length === 0 && (
                  <p style={{
                    fontSize: 11, color: '#c4b5fd', margin: '4px 0 0',
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