// types/attributes.ts

export interface AttributeOption {
  id: number
  value: string
  value_ar?: string
  color_hex?: string | null
}

export type AttributeType = 'select' | 'multiselect' | 'text' | 'number' | 'boolean' | 'color'

export interface Attribute {
  id: number
  slug: string
  name: string
  name_ar?: string
  type: AttributeType
  is_required: boolean
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

// Attribute values as stored in the form state
// key = attribute slug, value = depends on type:
//   select/color    → number (option id)
//   multiselect     → number[]
//   text            → string
//   number          → number | ''
//   boolean         → boolean
export type AttributeValues = Record<string, number | number[] | string | boolean | null>