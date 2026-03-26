'use client'

import { useEffect, useState } from 'react'

/**
 * Type for active filters
 * Example:
 * {
 *   color: [1,2],
 *   size: [3]
 * }
 */
export type ActiveAttrFilters = Record<string, number[]>

interface AttributeValue {
  id: number
  value: string
}

interface Attribute {
  id: number
  name: string
  slug: string
  values: AttributeValue[]
}

interface Props {
  categorySlug: string
  subcategorySlug: string | null
  activeFilters: ActiveAttrFilters
  onFilterChange: (filters: ActiveAttrFilters) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function AttributeFilterPanel({
  categorySlug,
  subcategorySlug,
  activeFilters,
  onFilterChange
}: Props) {
  const [attributes, setAttributes] = useState<Attribute[]>([])

  useEffect(() => {
    if (!categorySlug) return

    let url = `${API_URL}/api/attributes?category=${categorySlug}`
    if (subcategorySlug) url += `&subcategory=${subcategorySlug}`

    fetch(url)
      .then(res => res.json())
      .then(data => setAttributes(data.data ?? []))
      .catch(() => setAttributes([]))
  }, [categorySlug, subcategorySlug])

  const toggleValue = (attrSlug: string, valueId: number) => {
    const current = activeFilters[attrSlug] || []

    const updated = current.includes(valueId)
      ? current.filter(id => id !== valueId)
      : [...current, valueId]

    onFilterChange({
      ...activeFilters,
      [attrSlug]: updated
    })
  }

  if (!attributes.length) return null

  return (
    <div className="flex flex-col gap-4">
      {attributes.map(attr => (
        <div key={attr.id}>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">
            {attr.name}
          </p>

          <div className="flex flex-wrap gap-2">
            {attr.values.map(val => {
              const active = activeFilters[attr.slug]?.includes(val.id)

              return (
                <button
                  key={val.id}
                  onClick={() => toggleValue(attr.slug, val.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition
                    ${active
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                    }`}
                >
                  {val.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}