'use client'

/**
 * app/seller/components/ColorImageUploader.tsx
 *
 * Shown inside ProductModal when the seller has selected color options
 * in the VariantBuilder. Lets the seller upload images per color.
 *
 * FIX: slots are only initialized for NEW colorIds — existing slots with
 * already-uploaded files are never reset when selectedColorIds recomputes.
 * This prevents colorImages from being wiped to {} before submit.
 */

import { useEffect, useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import type { Attribute, AttributeOption } from '@/types/Attributes'

interface Props {
  /** The color axis attribute */
  colorAxis: Attribute | null | undefined
  /** The color option IDs the seller has selected in VariantBuilder */
  selectedColorIds: number[]
  /** Called whenever uploads change: colorOptionId → File[] */
  onChange: (map: Record<number, File[]>) => void
  /** Existing images from server when editing: colorOptionId → url[] */
  existingByColor?: Record<number, string[]>
  disabled?: boolean
}

interface ColorSlot {
  option: AttributeOption
  files: File[]
  previews: string[]
  existingUrls: string[]
}

export default function ColorImageUploader({
  colorAxis,
  selectedColorIds,
  onChange,
  existingByColor = {},
  disabled = false,
}: Props) {
  const [slots, setSlots] = useState<Record<number, ColorSlot>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // ── Sync slots when selectedColorIds changes ───────────────────────────────
  // CRITICAL: only ADD new color slots and REMOVE deselected ones.
  // Never reset files/previews for slots that already exist — this preserves
  // uploaded files across re-renders triggered by VariantBuilder changes.
  useEffect(() => {
    if (!colorAxis) return

    setSlots(prev => {
      const next: Record<number, ColorSlot> = {}

      for (const optId of selectedColorIds) {
        const option = colorAxis.options.find(o => o.id === optId)
        if (!option) continue

        if (prev[optId]) {
          // ← KEY FIX: reuse the existing slot as-is, preserving its files
          next[optId] = prev[optId]
        } else {
          // Brand-new color selected — create an empty slot
          next[optId] = {
            option,
            files:        [],
            previews:     [],
            existingUrls: existingByColor[optId] ?? [],
          }
        }
      }

      // Cleanup object URLs for colors that were deselected
      for (const [id, slot] of Object.entries(prev)) {
        if (!next[Number(id)]) {
          slot.previews.forEach(URL.revokeObjectURL)
        }
      }

      return next
    })
  // existingByColor is stable (memoized in parent); colorAxis.id covers axis changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColorIds.join(','), colorAxis?.id])

  // Cleanup all previews on unmount
  useEffect(() => {
    return () => {
      Object.values(slots).forEach(slot => slot.previews.forEach(URL.revokeObjectURL))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notify parent after every slots change
  useEffect(() => {
    const map: Record<number, File[]> = {}
    for (const [id, slot] of Object.entries(slots)) {
      if (slot.files.length > 0) map[Number(id)] = slot.files
    }
    onChange(map)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  const addFiles = (colorId: number, incoming: File[]) => {
    setSlots(prev => {
      const slot = prev[colorId]
      if (!slot) return prev

      const newFiles    = [...slot.files, ...incoming].slice(0, 5)
      const newPreviews = newFiles.map((f, i) =>
        i < slot.files.length ? slot.previews[i] : URL.createObjectURL(f)
      )

      return { ...prev, [colorId]: { ...slot, files: newFiles, previews: newPreviews } }
    })
  }

  const removeFile = (colorId: number, fileIdx: number) => {
    setSlots(prev => {
      const slot = prev[colorId]
      if (!slot) return prev

      URL.revokeObjectURL(slot.previews[fileIdx])

      return {
        ...prev,
        [colorId]: {
          ...slot,
          files:    slot.files.filter((_, i) => i !== fileIdx),
          previews: slot.previews.filter((_, i) => i !== fileIdx),
        },
      }
    })
  }

  if (!colorAxis || selectedColorIds.length === 0) return null

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
        Images per Color
        <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 500, color: '#c4b5fd', textTransform: 'none', letterSpacing: 0 }}>
          images switch when customer selects a color
        </span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedColorIds.map(colorId => {
          const slot = slots[colorId]
          if (!slot) return null

          const opt = slot.option
          const hasImages = slot.existingUrls.length + slot.files.length > 0

          return (
            <div key={colorId} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              {/* Color header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderBottom: hasImages ? '1px solid #e5e7eb' : 'none' }}>
                {opt.color_hex && (
                  <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: opt.color_hex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{opt.value}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                  {slot.existingUrls.length + slot.files.length}/5
                </span>
              </div>

              <div style={{ padding: '12px 14px' }}>
                {/* Existing server images */}
                {slot.existingUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {slot.existingUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                        <img src={url} alt={opt.value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 1, fontSize: 8, color: '#fff', fontWeight: 700 }}>
                          saved
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New file previews */}
                {slot.files.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {slot.previews.map((preview, fi) => (
                      <div key={fi} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                        <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeFile(colorId, fi)}
                          style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <X size={9} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload drop zone */}
                {slot.existingUrls.length + slot.files.length < 5 && (
                  <div
                    onClick={() => !disabled && inputRefs.current[colorId]?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                      addFiles(colorId, files)
                    }}
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: 8, padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: '#fafafa', transition: 'border-color 0.15s',
                    }}
                    className="hover:border-red-300"
                  >
                    <Upload size={14} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                      Upload images for <strong>{opt.value}</strong>
                    </span>
                    <input
                      ref={el => { inputRefs.current[colorId] = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={disabled}
                      onChange={e => {
                        addFiles(colorId, Array.from(e.target.files ?? []))
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}

                {!hasImages && slot.existingUrls.length + slot.files.length === 0 && (
                  <p style={{ fontSize: 11, color: '#c0c0c0', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ImageIcon size={10} /> No images for this color yet
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