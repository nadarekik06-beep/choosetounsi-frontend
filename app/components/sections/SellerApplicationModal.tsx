'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, CheckCircle, AlertCircle, ChevronDown, Loader2, User } from 'lucide-react'
import { api, getUser } from '@/lib/auth'

// ── Constants ─────────────────────────────────────────────────────────────────
const WILAYAS = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Le Kef','Mahdia','La Manouba','Médenine','Monastir',
  'Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur',
  'Tunis','Zaghouan',
]

const CATEGORIES = [
  'Fashion & Clothing','Electronics & Tech','Home & Living','Food & Grocery',
  'Beauty & Personal Care','Health & Wellness','Sports & Outdoors',
  'Arts & Crafts','Books & Stationery','Kids & Baby','Automotive','Other',
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers defined OUTSIDE component to prevent remount on every render
// ─────────────────────────────────────────────────────────────────────────────

function inputCls(err?: string) {
  return (
    'w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 ' +
    'outline-none transition-all duration-200 bg-white ' +
    (err
      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100')
  )
}

function Field({ label, id, error, children }: {
  label: string; id: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(.16,1,.3,1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-gray-600" />
        </button>
        {children}
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(.97); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormState {
  full_name: string
  phone_number: string
  business_name: string
  business_category: string
  business_description: string
  wilaya: string
  city: string
  facebook_url: string
  instagram_url: string
  website_url: string
}

interface Props { onClose: () => void }

// ── Main Component ────────────────────────────────────────────────────────────
export default function SellerApplicationModal({ onClose }: Props) {
  const [step, setStep]       = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  // ── Pre-fill full_name from logged-in user ────────────────────────────────
  const [form, setForm] = useState<FormState>(() => {
    // Read user from localStorage at initialisation time
    // getUser() is safe to call here because useState initialiser runs client-side
    const user = typeof window !== 'undefined' ? getUser() : null
    return {
      full_name:            user?.name  ?? '',
      phone_number:         '',
      business_name:        '',
      business_category:    '',
      business_description: '',
      wilaya:               '',
      city:                 '',
      facebook_url:         '',
      instagram_url:        '',
      website_url:          '',
    }
  })

  // Store whether the name came from the logged-in user (for the badge)
  const [namePrefilled, setNamePrefilled] = useState<boolean>(() => {
    const user = typeof window !== 'undefined' ? getUser() : null
    return !!(user?.name)
  })

  const [profilePic, setProfilePic]               = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)
  const [sampleImages, setSampleImages]           = useState<File[]>([])
  const [samplePreviews, setSamplePreviews]       = useState<string[]>([])

  const profileRef = useRef<HTMLInputElement>(null)
  const samplesRef = useRef<HTMLInputElement>(null)

  // ── Field change handler ──────────────────────────────────────────────────
  const handleChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      setForm(prev => ({ ...prev, [key]: val }))
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
      // If user manually edits the name, remove the "auto-filled" badge
      if (key === 'full_name') setNamePrefilled(false)
    }

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfilePic(file)
    setProfilePicPreview(URL.createObjectURL(file))
  }

  const handleSamples = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    if (sampleImages.length + incoming.length > 5) {
      setError('Maximum 5 sample images allowed.')
      return
    }
    const combined = [...sampleImages, ...incoming]
    setSampleImages(combined)
    setSamplePreviews(combined.map(f => URL.createObjectURL(f)))
    setError(null)
  }

  const removeSample = (idx: number) => {
    setSampleImages(prev => prev.filter((_, i) => i !== idx))
    setSamplePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {}
    if (s === 1) {
      if (!form.full_name.trim())     errs.full_name = 'Full name is required.'
      if (!form.phone_number.trim())  errs.phone_number = 'Phone number is required.'
      if (!form.business_name.trim()) errs.business_name = 'Business name is required.'
      if (!form.business_category)    errs.business_category = 'Please select a category.'
      if (form.business_description.trim().length < 30)
        errs.business_description = 'Please describe your business (at least 30 characters).'
    }
    if (s === 2) {
      if (!form.wilaya)       errs.wilaya = 'Please select your wilaya.'
      if (!form.city.trim())  errs.city   = 'City is required.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validateStep(step)) setStep(s => (s < 3 ? (s + 1) as 1|2|3 : s)) }
  const prev = () => setStep(s => (s > 1 ? (s - 1) as 1|2|3 : s))

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(step)) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (profilePic) fd.append('profile_picture', profilePic)
      sampleImages.forEach(f => fd.append('sample_images[]', f))
      await api.post('/seller-applications', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Something went wrong. Please try again.'
      setError(msg)
      const backendErrors = err?.response?.data?.errors ?? {}
      const mapped: Record<string, string> = {}
      Object.entries(backendErrors).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? v[0] : String(v)
      })
      if (Object.keys(mapped).length) setErrors(mapped)
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">
            Your seller application has been received. Our team will review it within{' '}
            <span className="font-semibold text-gray-700">2–3 business days</span> and notify you by email.
          </p>
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-colors">
            Back to Homepage
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <span className="h-px w-6 bg-red-500" />
          <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Choose Tounsi</span>
        </div>
        <h2 className="text-xl font-black text-gray-900">Become a Vendor</h2>
        <p className="text-gray-400 text-xs mt-0.5">Join 450+ local businesses selling on our platform</p>

        {/* Steps */}
        <div className="flex items-center gap-2 mt-4">
          {([1, 2, 3] as const).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-red-500 text-white shadow-md shadow-red-200'
                : step > s  ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`h-px w-8 transition-all ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-400 font-medium">
            {step === 1 ? 'Business Info' : step === 2 ? 'Location' : 'Media & Socials'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4">

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">

              {/* Full name — with auto-fill badge when prefilled */}
              <Field label="Full Name" id="full_name" error={errors.full_name}>
                <div className="relative">
                  <input
                    id="full_name" type="text" placeholder="Your full name"
                    value={form.full_name} onChange={handleChange('full_name')}
                    className={inputCls(errors.full_name) + (namePrefilled ? ' pr-10' : '')}
                  />
                  {namePrefilled && (
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      title="Auto-filled from your account"
                    >
                      <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
                        <User size={9} className="text-green-600" />
                        <span className="text-[9px] font-bold text-green-600 leading-none">Auto</span>
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Phone Number" id="phone_number" error={errors.phone_number}>
                <input
                  id="phone_number" type="tel" placeholder="+216 XX XXX XXX"
                  value={form.phone_number} onChange={handleChange('phone_number')}
                  className={inputCls(errors.phone_number)}
                />
              </Field>
            </div>

            <Field label="Business Name" id="business_name" error={errors.business_name}>
              <input
                id="business_name" type="text" placeholder="Your shop or brand name"
                value={form.business_name} onChange={handleChange('business_name')}
                className={inputCls(errors.business_name)}
              />
            </Field>

            <Field label="Business Category" id="business_category" error={errors.business_category}>
              <div className="relative">
                <select
                  id="business_category"
                  value={form.business_category}
                  onChange={handleChange('business_category')}
                  className={inputCls(errors.business_category) + ' appearance-none pr-10'}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>

            <Field label="Business Description" id="business_description" error={errors.business_description}>
              <textarea
                id="business_description" rows={4}
                placeholder="Tell us about your business, what you sell, and your story…"
                value={form.business_description}
                onChange={handleChange('business_description')}
                className={inputCls(errors.business_description) + ' resize-none'}
              />
              <span className="text-xs text-gray-400 text-right">
                {form.business_description.length} / 2000
              </span>
            </Field>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600 font-medium">
                📍 Your location helps buyers find local vendors near them.
              </p>
            </div>
            <Field label="Wilaya" id="wilaya" error={errors.wilaya}>
              <div className="relative">
                <select
                  id="wilaya" value={form.wilaya} onChange={handleChange('wilaya')}
                  className={inputCls(errors.wilaya) + ' appearance-none pr-10'}
                >
                  <option value="">Select your wilaya…</option>
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label="City / Delegation" id="city" error={errors.city}>
              <input
                id="city" type="text" placeholder="e.g. La Marsa, Sfax Ville…"
                value={form.city} onChange={handleChange('city')}
                className={inputCls(errors.city)}
              />
            </Field>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            {/* Profile picture */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Profile Picture <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => profileRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 hover:border-red-400 flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-gray-50"
                >
                  {profilePicPreview
                    ? <img src={profilePicPreview} alt="" className="w-full h-full object-cover" />
                    : <Upload size={20} className="text-gray-300" />}
                </div>
                <div>
                  <button type="button" onClick={() => profileRef.current?.click()}
                    className="text-sm text-red-500 font-semibold hover:text-red-600">
                    {profilePic ? 'Change photo' : 'Upload photo'}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · max 4MB</p>
                </div>
              </div>
              <input ref={profileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePic} />
            </div>

            {/* Sample images */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                Product Samples <span className="text-gray-400 font-normal">(up to 5, optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Show buyers what kind of products you'll sell</p>
              <div className="flex flex-wrap gap-3">
                {samplePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button" onClick={() => removeSample(i)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                {sampleImages.length < 5 && (
                  <div
                    onClick={() => samplesRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50"
                  >
                    <Upload size={16} className="text-gray-300" />
                    <span className="text-xs text-gray-300 mt-1">Add</span>
                  </div>
                )}
              </div>
              <input ref={samplesRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSamples} />
            </div>

            {/* Social links */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">
                Social Media <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <Field label="Facebook URL" id="facebook_url">
                <input
                  id="facebook_url" type="url" placeholder="https://facebook.com/yourbusiness"
                  value={form.facebook_url} onChange={handleChange('facebook_url')}
                  className={inputCls()}
                />
              </Field>
              <Field label="Instagram URL" id="instagram_url">
                <input
                  id="instagram_url" type="url" placeholder="https://instagram.com/yourbusiness"
                  value={form.instagram_url} onChange={handleChange('instagram_url')}
                  className={inputCls()}
                />
              </Field>
              <Field label="Website URL" id="website_url">
                <input
                  id="website_url" type="url" placeholder="https://yourbusiness.tn"
                  value={form.website_url} onChange={handleChange('website_url')}
                  className={inputCls()}
                />
              </Field>
            </div>
          </>
        )}

        {/* Global error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Step {step} of 3</span>
        <div className="flex gap-3">
          {step > 1 && (
            <button type="button" onClick={prev}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={next}
              className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
              Continue →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2">
              {loading
                ? <><Loader2 size={14} className="animate-spin" />Submitting…</>
                : '✓ Submit Application'}
            </button>
          )}
        </div>
      </div>

    </ModalShell>
  )
}