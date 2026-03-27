// types/Attributes.ts

export interface AttributeOption {
  id: number
  value: string
  value_ar?: string
  color_hex?: string | null
  order?: number
}

export type AttributeType = 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color'

export interface Attribute {
  id: number
  slug: string
  name: string
  name_ar?: string
  type: AttributeType
  is_required: boolean
  /**
   * When true: this attribute generates variant combinations (Color×Size matrix).
   * When false: informational / filter attribute only (Material, Brand, etc.)
   * Configured per subcategory in the subcategory_attributes pivot.
   */
  is_variant: boolean
  is_filterable: boolean
  options: AttributeOption[]
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  name_ar?: string
  slug: string
  icon?: string | null
}

/**
 * Response shape from GET /api/subcategories/{id}/attributes
 * Attributes are pre-split by the backend based on is_variant flag.
 */
export interface SubcategoryAttributesData {
  /** is_variant=true — used to generate variant combinations */
  variant_attributes: Attribute[]
  /** is_variant=false — informational/filter only */
  info_attributes: Attribute[]
}

// Attribute values as stored in the form state
// key = attribute slug, value depends on type:
//   select/color    → number (option id)
//   multiselect     → number[]
//   text            → string
//   number          → number | ''
//   boolean         → boolean
export type AttributeValues = Record<string, number | number[] | string | boolean | null>
