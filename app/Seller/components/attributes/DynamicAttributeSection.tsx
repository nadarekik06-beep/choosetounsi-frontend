'use client'

import { useEffect, useState } from 'react'
import { Attribute, AttributeValues } from '@/types/Attributes'
import AttributeField from './AttributeField'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ✅ Read token from localStorage (same logic as sellerApi.ts)
const TOKEN_KEYS = ['auth_token','token','ct_auth_token','access_token','sanctum_token','user_token']
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key)
    if (val) return val
  }
  return null
}

interface Props {
  subcategoryId: number | null
  values: AttributeValues
  onChange: (values: AttributeValues) => void
  disabled?: boolean
}

export default function DynamicAttributeSection({ subcategoryId, values, onChange, disabled }: Props) {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(false)

  useEffect(() => {
    if (!subcategoryId) { setAttributes([]); return }

    setLoading(true)
    setError(false)

    const token = getToken()
    fetch(`${API_URL}/api/subcategories/${subcategoryId}/attributes`, {
      headers: {
        Accept: 'application/json',
        // ✅ Send auth token so the request doesn't fail silently
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => setAttributes(json.attributes ?? json.data ?? []))
      // ✅ Catch error properly — never let it bubble to React
      .catch(() => { setAttributes([]); setError(true) })
      .finally(() => setLoading(false))
  }, [subcategoryId])

  const setField = (slug: string, value: AttributeValues[string]) => {
    onChange({ ...values, [slug]: value })
  }

  if (!subcategoryId) return null

  if (loading) {
    return (
      <div style={{ padding:'16px 0' }}>
        <div style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',
          letterSpacing:'0.08em',color:'#94a3b8',marginBottom:12 }}>
          Product Details
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height:40,borderRadius:12,
              background:'linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%)',
              backgroundSize:'600px 100%',animation:'shimmer 1.3s infinite linear' }}/>
          ))}
        </div>
        <style>{`@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
      </div>
    )
  }

  // ✅ Silently hide section if no attributes or error — don't crash the form
  if (attributes.length === 0) return null

  return (
    <div>
      <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',
        letterSpacing:'0.08em',color:'#94a3b8',
        paddingBottom:8,borderBottom:'1px solid #f0f0f0',marginBottom:16 }}>
        Product Details
      </p>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'12px 16px' }}>
        {attributes.map(attr => {
          const fullWidth = ['boolean','multiselect','color'].includes(attr.type)
          return (
            <div key={attr.id} style={{ gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
              <label style={{ display:'block',fontSize:11,fontWeight:800,
                textTransform:'uppercase',letterSpacing:'0.07em',
                color:'#94a3b8',marginBottom:6 }}>
                {attr.name}
                {attr.is_required && <span style={{ color:'#ef4444',marginLeft:2 }}>*</span>}
              </label>
              <AttributeField
                attr={attr}
                values={values}
                onChange={setField}
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}