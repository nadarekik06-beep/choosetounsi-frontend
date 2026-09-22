'use client'
/**
 * app/seller/components/attributes/DynamicAttributeSection.tsx
 *
 * Renders attribute inputs for a subcategory.
 *
 * UPDATED: accepts an optional `overrideAttributes` prop.
 * When provided, it renders those attributes directly instead of fetching.
 * This lets ProductModal pass only the is_variant=false attributes
 * so variant axes aren't shown twice.
 */
import { useEffect, useState } from 'react'
import type { Attribute, AttributeValues } from '@/types/Attributes'
import { categoriesApi } from '@/lib/sellerApi'
import AttributeField from './AttributeField'
import { Loader2 } from 'lucide-react'

interface Props {
  subcategoryId: number
  values: AttributeValues
  onChange: (values: AttributeValues) => void
  disabled?: boolean
  /**
   * When provided, renders these attributes instead of fetching from the API.
   * Use this to pass only is_variant=false attributes so variant axes
   * are not duplicated between this section and VariantBuilder.
   */
  overrideAttributes?: Attribute[]
}

export default function DynamicAttributeSection({
  subcategoryId,
  values,
  onChange,
  disabled = false,
  overrideAttributes,
}: Props) {
  const [attributes, setAttributes] = useState<Attribute[]>(overrideAttributes ?? [])
  const [loading,    setLoading]    = useState(!overrideAttributes)

  // If overrideAttributes is provided, use it directly without fetching
  useEffect(() => {
    if (overrideAttributes !== undefined) {
      setAttributes(overrideAttributes)
      setLoading(false)
      return
    }
    // Otherwise fetch all attributes for this subcategory
    // and filter to only show non-variant ones
    setLoading(true)
    categoriesApi.getSubcategoryAttributes(subcategoryId)
      .then(res => {
        const data = res.data as any
        // Support both old flat array and new split response
        if (Array.isArray(data)) {
          setAttributes(data)
        } else {
          // New format: show only info attributes in this section
          setAttributes(data.info_attributes ?? [])
        }
      })
      .catch(() => setAttributes([]))
      .finally(() => setLoading(false))
  }, [subcategoryId, overrideAttributes])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>
        <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
        Loading attributes…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (attributes.length === 0) return null

  // AttributeField expects: attr, values, onChange(slug, value), disabled
  // We adapt our (values, onChange(values)) interface to match it.
  const handleFieldChange = (slug: string, val: AttributeValues[string]) => {
    onChange({ ...values, [slug]: val })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {attributes.map(attr => (
        <AttributeField
          key={attr.id}
          attr={attr}
          values={values}
          onChange={handleFieldChange}
          disabled={disabled}
        />
      ))}
    </div>
  )
}