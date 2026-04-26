'use client'

/**
 * app/onboarding/page.tsx
 * ChooseTounsi — User preference onboarding page
 *
 * Triggered automatically after first login (via middleware).
 * User can complete preferences OR skip.
 * On completion, sets onboarding_completed = true on the backend.
 * Then redirects to the original destination or home.
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getToken, getUser, refreshUser } from '@/lib/auth'
import { Loader2, ChevronRight, ChevronLeft, Check, X, ShoppingBag, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category  { id: number; name: string; slug: string; icon: string | null }
interface Brand     { id: number; name: string }
interface PriceRange { label: string; min: number; max: number | null }
interface Gender    { value: string; label: string }

interface OnboardingData {
  categories:   Category[]
  brands:       Brand[]
  genders:      Gender[]
  price_ranges: PriceRange[]
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = ['gender', 'categories', 'brands', 'price'] as const
type Step = typeof STEPS[number]

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/'

  const [data,         setData]         = useState<OnboardingData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [step,         setStep]         = useState<Step>('gender')
  const [stepIndex,    setStepIndex]    = useState(0)

  // Form state
  const [selectedGender,      setSelectedGender]      = useState<string | null>(null)
  const [selectedCategories,  setSelectedCategories]  = useState<number[]>([])
  const [selectedBrands,      setSelectedBrands]      = useState<number[]>([])
  const [selectedPriceRange,  setSelectedPriceRange]  = useState<PriceRange | null>(null)

  // Auth guard
  useEffect(() => {
    const token = getToken()
    const user  = getUser()
    if (!token || !user) {
      router.replace('/auth/login')
      return
    }
    if (user.role !== 'client') {
      // Only clients go through onboarding
      router.replace(redirect)
      return
    }
  }, [])

  // Load onboarding data
  useEffect(() => {
    const token = getToken()
    if (!token) return

    fetch(`${API_URL}/preferences/onboarding-data`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const goNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) {
      setStepIndex(nextIndex)
      setStep(STEPS[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      setStepIndex(prevIndex)
      setStep(STEPS[prevIndex])
    }
  }

  const handleSave = async () => {
    const token = getToken()
    if (!token) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (selectedGender)       body.gender       = selectedGender
      if (selectedCategories.length) body.category_ids = selectedCategories
      if (selectedBrands.length)     body.brand_ids    = selectedBrands
      if (selectedPriceRange) {
        body.price_min = selectedPriceRange.min
        body.price_max = selectedPriceRange.max
      }

      const res = await fetch(`${API_URL}/preferences`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        // Refresh user object in localStorage to include onboarding_completed=true
        await refreshUser()
        router.replace(redirect)
      }
    } catch {
      // Silent fail — still redirect
      router.replace(redirect)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    const token = getToken()
    if (!token) { router.replace(redirect); return }

    try {
      await fetch(`${API_URL}/preferences/skip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      await refreshUser()
    } catch {}
    router.replace(redirect)
  }

  const toggleCategory = (id: number) =>
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )

  const toggleBrand = (id: number) =>
    setSelectedBrands(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#dc2626' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .ob-card:hover { border-color: #dc2626 !important; background: rgba(220,38,38,0.03) !important; transform: translateY(-2px); }
        .ob-card.selected { border-color: #dc2626 !important; background: rgba(220,38,38,0.06) !important; }
        .ob-gender:hover { border-color: #dc2626 !important; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(220,38,38,0.12) !important; }
        .ob-gender.selected { border-color: #dc2626 !important; background: linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.03)) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdf9f9 0%, #f9fafb 100%)', fontFamily: "'Barlow', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(220,38,38,0.3)' }}>
              <ShoppingBag size={22} color="#fff" />
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Personalize Your Experience
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0, fontWeight: 500 }}>
            Help us show you the products you'll love most
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < stepIndex ? '#dc2626' : i === stepIndex ? '#dc2626' : '#e5e7eb',
                  color: i <= stepIndex ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                  transition: 'all 0.3s',
                }}>
                  {i < stepIndex ? <Check size={12} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 48, height: 2, background: i < stepIndex ? '#dc2626' : '#e5e7eb', transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', padding: '32px 32px 28px', animation: 'fadeUp 0.4s ease 0.1s both' }}>

          {/* ── STEP 1: Gender ── */}
          {step === 'gender' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 1 of 4</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>Who do you shop for?</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>We'll prioritize products that match your preference. Optional.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {(data?.genders ?? []).map(g => (
                  <button
                    key={g.value}
                    className={`ob-gender${selectedGender === g.value ? ' selected' : ''}`}
                    onClick={() => setSelectedGender(prev => prev === g.value ? null : g.value)}
                    style={{ padding: '20px 12px', borderRadius: 14, border: `2px solid ${selectedGender === g.value ? '#dc2626' : '#e5e7eb'}`, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>
                      {g.value === 'male' ? '👔' : g.value === 'female' ? '👗' : '✨'}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: selectedGender === g.value ? '#dc2626' : '#374151', margin: 0 }}>{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Categories ── */}
          {step === 'categories' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 2 of 4</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>What do you shop for?</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Pick all that apply.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
                {(data?.categories ?? []).map(cat => {
                  const selected = selectedCategories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      className={`ob-card${selected ? ' selected' : ''}`}
                      onClick={() => toggleCategory(cat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${selected ? '#dc2626' : '#e5e7eb'}`, background: selected ? 'rgba(220,38,38,0.05)' : '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 20 }}>{cat.icon ?? '📦'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#dc2626' : '#374151' }}>{cat.name}</span>
                      {selected && <Check size={13} color="#dc2626" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
              {selectedCategories.length > 0 && (
                <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, margin: 0 }}>
                  ✓ {selectedCategories.length} selected
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: Brands ── */}
          {step === 'brands' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 3 of 4</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>Any favorite brands?</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Optional. You can always change this later.</p>
              </div>
              {(data?.brands ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>No brands available yet.</p>
                  <p style={{ fontSize: 12 }}>Skip to continue.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, maxHeight: 280, overflowY: 'auto' }}>
                  {(data?.brands ?? []).map(brand => {
                    const selected = selectedBrands.includes(brand.id)
                    return (
                      <button
                        key={brand.id}
                        onClick={() => toggleBrand(brand.id)}
                        style={{ padding: '8px 16px', borderRadius: 999, border: `1.5px solid ${selected ? '#dc2626' : '#e5e7eb'}`, background: selected ? '#dc2626' : '#fff', color: selected ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      >
                        {brand.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Price ── */}
          {step === 'price' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Step 4 of 4</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>What's your budget?</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Optional. We'll prioritize products in this range.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {(data?.price_ranges ?? []).map(range => {
                  const selected = selectedPriceRange?.label === range.label
                  return (
                    <button
                      key={range.label}
                      className={`ob-card${selected ? ' selected' : ''}`}
                      onClick={() => setSelectedPriceRange(prev => prev?.label === range.label ? null : range)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: `1.5px solid ${selected ? '#dc2626' : '#e5e7eb'}`, background: selected ? 'rgba(220,38,38,0.05)' : '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: selected ? '#dc2626' : '#374151' }}>{range.label}</span>
                      {selected && <Check size={16} color="#dc2626" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <button
              onClick={stepIndex === 0 ? handleSkip : goBack}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {stepIndex === 0 ? <><X size={14} /> Skip</> : <><ChevronLeft size={14} /> Back</>}
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, border: 'none', background: saving ? '#e5e7eb' : 'linear-gradient(135deg, #dc2626, #b91c1c)', color: saving ? '#9ca3af' : '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 14px rgba(220,38,38,0.3)' }}
              >
                {saving
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                  : <><Sparkles size={14} /> Finish Setup</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8', fontWeight: 500, textAlign: 'center' }}>
          You can always update these preferences from your profile settings.
        </p>
      </div>
    </>
  )
}