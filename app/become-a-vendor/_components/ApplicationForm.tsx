'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Upload, CheckCircle, AlertCircle,
  User, Check, Clock, RefreshCw, Eye, UserPlus, Paperclip, MessageCircle,
} from 'lucide-react'
import { api, getUser, refreshUser } from '@/lib/auth'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'
import PickupAddressFields from '@/components/pickup/PickupAddressFields'
import {
  emptyPickupAddress, pickupErrorsFromApi, pickupFromApi, pickupPayload, validatePickupAddress,
  type PickupAddressValue, type PickupErrors,
} from '@/lib/pickupAddress'
import {
  checkBusinessName, checkCategories, checkDescription, checkFullName, checkLink, checkPhone,
  formatPhone, normalizePhone, LIMITS, type Issue,
} from '@/lib/sellerApplication/normalize'
import { prepareImage, type PreparedImage } from '@/lib/sellerApplication/prepareImage'
import { WHATSAPP_URL } from '@/lib/contactInfo'

import BrandLoader from '@/components/brand/BrandLoader'
import { saveApplicationDraft, readApplicationDraft, clearApplicationDraft } from './applicationDraft'
import { API_BASE } from '@/lib/constants'
const FALLBACK_CATEGORIES = [
  'Fashion & Clothing','Electronics & Tech','Home & Living','Food & Grocery',
  'Beauty & Personal Care','Health & Wellness','Sports & Outdoors',
  'Arts & Crafts','Books & Stationery','Kids & Baby','Automotive','Other',
]

const COMPLETENESS_WEIGHTS = {
  full_name:            5,
  phone_number:         5,
  business_name:        10,
  categories:           10,
  subcategories:        5,
  pickup_zone:          8,
  pickup_pin:           7,
  profile_picture:      20,
  sample_images:        15,
  sample_images_bonus:  5,
  business_description: 5,
  social_link:          5,
} as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  full_name: string
  phone_number: string
  business_name: string
  // The pickup address (Intigo form fields) lives in its own state: PickupAddressValue
  facebook_url: string
  instagram_url: string
  website_url: string
  pricing_range: '' | 'budget' | 'mid' | 'premium'
  business_description: string
}

// `name` is the original (English) name stored on the application; `label` is the
// translated name shown to the user (the API sends it as `name` + `base_name`).
interface ApiCategory {
  id: number
  name: string
  label: string
  slug: string
}

interface ApiSubcategory {
  id: number
  name: string
  label: string
  slug: string
  category_id: number
}

type LocalizedRow = { name: string; base_name?: string }
const withBaseName = <T extends LocalizedRow>(rows: T[]) =>
  rows.map(r => ({ ...r, name: r.base_name ?? r.name, label: r.name }))

interface SampleItem {
  file: File | null
  preview: string
  caption: string
  isExisting?: boolean
}

export interface ExistingApplication {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  plan: string
  preferred_plan: string
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  full_name: string
  phone_number: string
  business_name: string
  business_category: string
  business_categories: string[]
  business_subcategories: string[]
  pricing_range: string | null
  wilaya: string
  city: string
  pickup?: Record<string, unknown> | null
  business_description: string | null
  profile_picture_url: string | null
  sample_images_urls: string[]
  sample_captions: string[]
  facebook_url: string | null
  instagram_url: string | null
  website_url: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** `hint`: the field needs a look (soft amber, never red). */
function inputCls(hint?: string | null) {
  return (
    'w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-400 ' +
    'outline-none transition-all duration-200 bg-white/90 backdrop-blur-sm ' +
    (hint
      ? 'border-amber-400 focus:ring-2 focus:ring-amber-100'
      : 'border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100')
  )
}

/** The line under a field: a 💡 hint (what to fix and why) or a green confirmation. */
function GuideLine({ hint, success }: { hint?: string | null; success?: string | null }) {
  if (hint) {
    return (
      <p role="status" aria-live="polite" className="ct-guide-hint">
        <span aria-hidden="true">💡</span><span>{hint}</span>
      </p>
    )
  }
  if (success) return <p className="ct-guide-ok">{success}</p>
  return null
}

function Field({ label, id, hint, ok, success, children, optional }: {
  label: string; id: string; hint?: string | null; ok?: boolean; success?: string | null
  children: React.ReactNode; optional?: boolean
}) {
  const tc = useTranslations('common')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>
          {label}
          {optional && (
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9ca3af', marginInlineStart: 6 }}>
              ({tc('optional')})
            </span>
          )}
        </span>
        {ok && !hint && <span className="ct-guide-check" aria-hidden="true"><Check size={10} strokeWidth={3} /></span>}
      </label>
      {children}
      <GuideLine hint={hint} success={success} />
    </div>
  )
}

/** Under a photo picker: "preparing…", "made lighter ✓", or what's missing. */
function PhotoGuide({ busy, note, hint }: {
  busy: boolean
  note?: { kind: 'reduced' | 'converted' } | { kind: 'unreadable' } | { kind: 'kept'; count: number }
  hint: string | null
}) {
  const tgd = useTranslations('vendor.guide')
  if (busy) {
    return (
      <p className="ct-guide-ok" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
        <BrandLoader variant="inline" size={12} />{tgd('photoWorking')}
      </p>
    )
  }
  if (hint) return <GuideLine hint={hint} />
  if (!note) return null
  if (note.kind === 'unreadable') return <GuideLine hint={tgd('photoUnreadable')} />
  if (note.kind === 'kept') return <GuideLine hint={tgd('samplesKept', { count: note.count })} />
  return <GuideLine success={tgd(note.kind === 'converted' ? 'photoConverted' : 'photoReduced')} />
}

// ── Status Banner ─────────────────────────────────────────────────────────────

function ApplicationStatusBanner({ app, onEdit }: { app: ExistingApplication; onEdit: () => void }) {
  const t   = useTranslations('vendor.status')
  const fmt = useFormat()
  const isPending  = app.status === 'pending'
  const isApproved = app.status === 'approved'
  const isRejected = app.status === 'rejected'

  const config = isApproved
    ? { bg: '#f0fdf4', border: '#86efac', icon: CheckCircle, iconColor: '#16a34a', title: t('approvedTitle'), titleColor: '#15803d' }
    : isRejected
    ? { bg: '#fef2f2', border: '#fecaca', icon: AlertCircle, iconColor: '#dc2626', title: t('rejectedTitle'), titleColor: '#dc2626' }
    : { bg: '#fefce8', border: '#fde68a', icon: Clock, iconColor: '#d97706', title: t('pendingTitle'), titleColor: '#b45309' }

  const Icon = config.icon

  return (
    <div style={{ background: config.bg, border: `1.5px solid ${config.border}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${config.iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={config.iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: '0.95rem', color: config.titleColor, marginBottom: 4 }}>{config.title}</p>
          {isPending && (
            <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
              {t('pendingBody', { date: fmt.date(app.created_at, 'long') })}
            </p>
          )}
          {isApproved && (
            <p style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: 1.5, margin: 0 }}>
              {t.rich('approvedBody', { b: c => <strong>{c}</strong> })}
            </p>
          )}
          {isRejected && (
            <>
              {app.rejection_reason && (
                <p style={{ fontSize: '0.8rem', color: '#dc2626', lineHeight: 1.5, margin: '0 0 10px' }}>
                  <strong>{t('reason')}</strong> {app.rejection_reason}
                </p>
              )}
              <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: 0 }}>
                {t('rejectedBody')}
              </p>
            </>
          )}
        </div>
        {(isPending || isRejected) && (
          <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'white', border: `1px solid ${config.border}`, color: config.titleColor, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {isPending ? <Eye size={13} /> : <RefreshCw size={13} />}
            {isPending ? t('view') : t('editResubmit')}
          </button>
        )}
      </div>
    </div>
  )
}
// ── Application form ──────────────────────────────────────────────────────────
// Moved out of page.tsx unchanged: state, category loading, validation and submit
// behave exactly as before. The page owns the success screen (onSuccess).

interface ApplicationFormProps {
  /** Called after a successful submit; `wasUpdate` is true when an existing application was edited. */
  onSuccess: (wasUpdate: boolean) => void
  /** Reports the loaded application (null = none) so the page can adapt its hero. */
  onApplication: (app: ExistingApplication | null) => void
  /** Scrolls the page to the top of the form section. */
  scrollToForm: () => void
  /** Not signed in: the form is usable, an account is asked for on submit. */
  guest?: boolean
  /** Signed in from the modal, the page is re-checking role / application. */
  resolvingAuth?: boolean
  /** Opens the in-page sign-up / sign-in modal. */
  onRequireAuth?: (tab: 'register' | 'login') => void
}

const FORM_KEYS = [
  'full_name', 'phone_number', 'business_name', 'facebook_url', 'instagram_url',
  'website_url', 'pricing_range', 'business_description',
] as const

type SubmitProblem =
  | { kind: 'fields' }                       // 422: the seller was taken to the field
  | { kind: 'message'; message: string }     // a sentence from the server (already translated)
  | { kind: 'tooLarge' }                     // 413
  | { kind: 'network' }                      // no answer / timeout
  | { kind: 'server' }                       // 5xx
  | { kind: 'photosBusy' }                   // clicked Send while photos were being prepared

type PhotoNote =
  | { kind: 'reduced' | 'converted' }
  | { kind: 'unreadable' }
  | { kind: 'kept'; count: number }

/** The fields each step checks, in screen order (the first one to fix is scrolled to). */
const STEP_FIELDS: Record<1 | 2 | 3, string[]> = {
  1: ['full_name', 'phone_number', 'business_name', 'business_category', 'pricing_range'],
  2: ['pk:adresse_complete', 'pk:zone', 'pk:pin', 'pk:contact_name', 'pk:phone', 'pk:code_postal', 'pk:indications'],
  3: ['profile_picture', 'sample_images', 'business_description', 'facebook_url', 'instagram_url', 'website_url'],
}
const STEP_OF = (key: string): 1 | 2 | 3 =>
  STEP_FIELDS[1].includes(key) ? 1 : STEP_FIELDS[2].includes(key) ? 2 : 3

/** Field key → element to scroll to. */
const GUIDE_DOM: Record<string, string> = {
  'pk:adresse_complete': 'apply-pk-adresse', 'pk:zone': 'apply-pk-zone', 'pk:pin': 'apply-pk-map',
  'pk:contact_name': 'apply-pk-contact', 'pk:phone': 'apply-pk-phone', 'pk:code_postal': 'apply-pk-postal',
  'pk:indications': 'apply-pk-notes',
}

/** Laravel field names → ours ("sample_images.2" → "sample_images"). */
function fieldOfServerKey(key: string): string {
  const base = key.replace(/\.\d+$/, '').replace(/\.\*$/, '')
  if (base === 'business_categories' || base === 'business_subcategories') return 'business_category'
  if (base === 'sample_captions') return 'sample_images'
  return base
}

/** The saved draft, if it belongs to this visitor and to this application (null = a new one). */
function usableDraft(appId: number | null) {
  const d = readApplicationDraft()
  if (!d) return null
  const me = getUser()?.id ?? null
  if (d.userId != null && d.userId !== me) return null   // someone else's, on a shared device
  if ((d.appId ?? null) !== appId) return null
  return d
}

export default function ApplicationForm({
  onSuccess, onApplication, scrollToForm, guest = false, resolvingAuth = false, onRequireAuth,
}: ApplicationFormProps) {
  const t   = useTranslations('vendor')
  const tc  = useTranslations('common')
  const tpa = useTranslations('pickupAddress')
  const tg  = useTranslations('vendor.guest')

  const [existingApp,  setExistingApp]  = useState<ExistingApplication | null>(null)
  const [appLoading,   setAppLoading]   = useState(false)
  const [loadFailed,   setLoadFailed]   = useState(false)
  const [isEditing,    setIsEditing]    = useState(false)
  const [existingId,   setExistingId]   = useState<number | null>(null)

  const tgd = useTranslations('vendor.guide')

  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [loading,     setLoading]     = useState(false)
  // What went wrong on submit, said calmly (see handleSubmit)
  const [problem,     setProblem]     = useState<SubmitProblem | null>(null)
  // Messages sent back by the server, per field (shown as hints, cleared on change)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  // Fields the seller has left once (blur) or that a "Suivant" click checked
  const [touched,     setTouched]     = useState<Record<string, boolean>>({})
  // Field to scroll to and highlight after the next render (a new object each time:
  // asking twice for the same field scrolls again)
  const [guideTarget, setGuideTarget] = useState<{ key: string } | null>(null)
  // Photo notes: "made lighter ✓", "iPhone photo converted ✓", "couldn't open it"
  const [photoNotes,  setPhotoNotes]  = useState<{ profile_picture?: PhotoNote; sample_images?: PhotoNote }>({})
  const [photosBusy,  setPhotosBusy]  = useState(0)
  const [form, setForm] = useState<FormState>(() => {
    const user = typeof window !== 'undefined' ? getUser() : null
    return {
      full_name: user?.name ?? '', phone_number: '', business_name: '',
      facebook_url: '', instagram_url: '', website_url: '',
      pricing_range: '', business_description: '',
    }
  })

  const [pickup,       setPickup]       = useState<PickupAddressValue>(emptyPickupAddress)
  const [pickupErrors, setPickupErrors] = useState<PickupErrors>({})

  const [namePrefilled] = useState<boolean>(() =>
    !!(typeof window !== 'undefined' ? getUser()?.name : null)
  )

  const [profilePic,         setProfilePic]         = useState<File | null>(null)
  const [profilePicPreview,  setProfilePicPreview]  = useState<string | null>(null)
  const [profilePicExisting, setProfilePicExisting] = useState<string | null>(null)
  const profileRef = useRef<HTMLInputElement>(null)
  const samplesRef = useRef<HTMLInputElement>(null)

  const [samples,              setSamples]              = useState<SampleItem[]>([])
  const [apiCategories,        setApiCategories]        = useState<ApiCategory[]>([])
  const [categoriesLoading,    setCategoriesLoading]    = useState(false)
  const [selectedCategories,   setSelectedCategories]   = useState<string[]>([])
  const [subcategoriesMap,     setSubcategoriesMap]     = useState<Record<string, ApiSubcategory[]>>({})
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [selectedSubcats,      setSelectedSubcats]      = useState<string[]>([])

  // ── Completeness score ────────────────────────────────────────────────
  const completenessScore = (() => {
    let score = 0
    if (form.full_name.trim())         score += COMPLETENESS_WEIGHTS.full_name
    if (form.phone_number.trim())      score += COMPLETENESS_WEIGHTS.phone_number
    if (form.business_name.trim())     score += COMPLETENESS_WEIGHTS.business_name
    if (selectedCategories.length > 0) score += COMPLETENESS_WEIGHTS.categories
    if (selectedSubcats.length > 0)    score += COMPLETENESS_WEIGHTS.subcategories
    if (pickup.zone)                   score += COMPLETENESS_WEIGHTS.pickup_zone
    if (pickup.latitude != null)       score += COMPLETENESS_WEIGHTS.pickup_pin
    if (profilePic || profilePicExisting) score += COMPLETENESS_WEIGHTS.profile_picture
    if (samples.length >= 1)           score += COMPLETENESS_WEIGHTS.sample_images
    if (samples.length >= 2)           score += COMPLETENESS_WEIGHTS.sample_images_bonus
    if (form.business_description.trim().length >= 50) score += COMPLETENESS_WEIGHTS.business_description
    if (form.facebook_url || form.instagram_url || form.website_url) score += COMPLETENESS_WEIGHTS.social_link
    return Math.min(score, 100)
  })()

  const completenessColor =
    completenessScore >= 80 ? '#198f41' :
    completenessScore >= 50 ? '#f59e0b' : '#db142e'

  const completenessHint = (() => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.business_name.trim())
      return t('hints.basic')
    if (selectedCategories.length === 0) return t('hints.category')
    if (selectedSubcats.length === 0 && Object.keys(subcategoriesMap).length > 0)
      return t('hints.subcategory')
    if (!pickup.zone || pickup.latitude == null) return t('hints.location')
    if (!profilePic && !profilePicExisting)
      return t('hints.picture')
    if (samples.length === 0) return t('hints.sample')
    if (samples.length === 1) return t('hints.sampleMore')
    if (!form.business_description.trim()) return t('hints.description')
    if (!form.facebook_url && !form.instagram_url && !form.website_url) return t('hints.social')
    return t('hints.done')
  })()

  // ── Fetch categories ──────────────────────────────────────────────────
  useEffect(() => {
    setCategoriesLoading(true)
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(json => setApiCategories(withBaseName(json?.data ?? [])))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  // ── Fetch subcategories when categories change ────────────────────────
  useEffect(() => {
    if (selectedCategories.length === 0) return
    const toFetch = selectedCategories.filter(catName => {
      const cat = apiCategories.find(c => c.name === catName)
      return cat && !subcategoriesMap[catName]
    })
    if (toFetch.length === 0) return
    setSubcategoriesLoading(true)
    Promise.all(
      toFetch.map(catName => {
        const cat = apiCategories.find(c => c.name === catName)
        if (!cat) return Promise.resolve({ catName, subs: [] as ApiSubcategory[] })
        return fetch(`${API_BASE}/categories/${cat.slug}/subcategories`)
          .then(r => r.json())
          .then(json => ({ catName, subs: withBaseName(json?.data ?? []) as ApiSubcategory[] }))
          .catch(() => ({ catName, subs: [] as ApiSubcategory[] }))
      })
    ).then(results => {
      setSubcategoriesMap(prev => {
        const updated = { ...prev }
        results.forEach(({ catName, subs }) => { updated[catName] = subs })
        return updated
      })
    }).finally(() => setSubcategoriesLoading(false))
  }, [selectedCategories, apiCategories])

  // ── Clean up subcats when categories removed ──────────────────────────
  useEffect(() => {
    const allSubs = selectedCategories.flatMap(cat => subcategoriesMap[cat] ?? [])
    const validSubNames = new Set(allSubs.map(s => s.name))
    setSelectedSubcats(prev => prev.filter(s => validSubNames.has(s)))
  }, [selectedCategories, subcategoriesMap])

  // Subcategories loaded with their categories (existing application, guest draft):
  // applied once those categories' lists have loaded, or the cleanup above drops them.
  const pendingSubcats = useRef<string[] | null>(null)

  // ── Load existing application ─────────────────────────────────────────
  const existingIdRef = useRef<number | null>(null)
  const loadExistingApplication = useCallback(async (): Promise<'none' | 'exists' | 'failed'> => {
    setAppLoading(true)
    setLoadFailed(false)
    try {
      // ─── FIX: axios returns response.data automatically.
      // Laravel sends: { success: true, data: null } or { success: true, data: {...} }
      // So `res` here is already { success, data } — we need res.data for the app object.
      // One retry on a network error/timeout before giving up.
      const res = await api.get('/seller-applications/mine')
        .catch(() => new Promise(r => setTimeout(r, 1200)).then(() => api.get('/seller-applications/mine')))

      // res is the axios response wrapper, res.data is { success, data }
      // So the actual application is at res.data.data
      const responseBody = (res as { data?: { data?: ExistingApplication | null } }).data  // { success: true, data: null | {...} }
      const app: ExistingApplication | null = responseBody?.data ?? null

      // ─── CRITICAL GUARD: only set existingApp if we have a real application
      // with a valid numeric id. Prevents ghost banners from malformed responses.
      if (!app || typeof app.id !== 'number') {
        setExistingApp(null)
        setExistingId(null)
        return 'none'
      }

      setExistingApp(app)
      setExistingId(app.id)
      existingIdRef.current = app.id

      setForm({
        full_name:            app.full_name            ?? '',
        phone_number:         app.phone_number         ?? '',
        business_name:        app.business_name        ?? '',
        facebook_url:         app.facebook_url         ?? '',
        instagram_url:        app.instagram_url        ?? '',
        website_url:          app.website_url          ?? '',
        pricing_range:        (app.pricing_range as FormState['pricing_range']) ?? '',
        business_description: app.business_description ?? '',
      })

      setPickup(pickupFromApi(app.pickup ?? null))

      setSelectedCategories(app.business_categories    ?? [])
      pendingSubcats.current = app.business_subcategories ?? []

      if (app.profile_picture_url) {
        setProfilePicPreview(app.profile_picture_url)
        setProfilePicExisting(app.profile_picture_url)
      }

      if (app.sample_images_urls?.length) {
        setSamples(app.sample_images_urls.map((url, i) => ({
          file: null, preview: url,
          caption: app.sample_captions?.[i] ?? '',
          isExisting: true,
        })))
      }
      return 'exists'
    } catch (err) {
      setExistingApp(null)
      setExistingId(null)
      // A 404 means "no application": fresh form. Any other failure (network,
      // timeout, 5xx) must not show a blank form, or an applicant could submit
      // a duplicate application: offer a retry instead.
      if ((err as { response?: { status?: number } })?.response?.status !== 404) { setLoadFailed(true); return 'failed' }
      return 'none'
    } finally {
      setAppLoading(false)
    }
  }, [])

  // ── Guest draft (sessionStorage) ──────────────────────────────────────
  // Saved before the sign-in modal opens; restored after a reload or the Google
  // round trip (files can't be kept: the applicant re-attaches them).
  const awaitingAuth   = useRef(false)          // guest clicked Submit: send once signed in
  const submitRef      = useRef<() => Promise<void>>(async () => {})
  const startedAsGuest = useRef(guest)          // the live form already holds the guest data
  const [resuming, setResuming] = useState(false)
  const [restored, setRestored] = useState(false)

  const saveDraft = () => saveApplicationDraft({
    step, form: { ...form }, pickup, categories: selectedCategories, subcategories: selectedSubcats,
    userId: getUser()?.id ?? null, appId: existingId,
  })

  // Autosave starts once the saved draft (if any) has been read back, or the
  // empty first render would overwrite it.
  const draftReady = useRef(false)
  // A draft of edits to the existing application, applied when "Edit" is clicked
  const editDraftFor = useRef<number | null>(null)

  const restoreDraft = useCallback((appId: number | null = null): boolean => {
    const d = usableDraft(appId)
    if (!d) return false
    setForm(prev => {
      const next = { ...prev }
      FORM_KEYS.forEach(k => { if (typeof d.form[k] === 'string') (next as Record<string, string>)[k] = d.form[k] })
      return next
    })
    setPickup({ ...emptyPickupAddress(), ...d.pickup })
    setSelectedCategories(Array.isArray(d.categories) ? d.categories.slice(0, 5) : [])
    // Subcategories are re-applied once their lists have loaded (see below).
    pendingSubcats.current = Array.isArray(d.subcategories) ? d.subcategories : []
    setStep(d.step === 2 || d.step === 3 ? d.step : 1)
    setRestored(true)
    setTimeout(scrollToForm, 300)
    return true
  }, [scrollToForm])

  // Signed-in users: load their application (as before). Guests: no API call.
  // Signed in from the modal after clicking Submit: same check, then send.
  useEffect(() => {
    if (guest) { restoreDraft(); draftReady.current = true; return }
    let alive = true
    if (awaitingAuth.current) setResuming(true)
    loadExistingApplication().then(async result => {
      if (!alive) return
      if (awaitingAuth.current) {
        awaitingAuth.current = false
        if (result === 'none') await submitRef.current()
        else if (result === 'exists') clearApplicationDraft()  // pending / rejected: existing banner, nothing sent
        setResuming(false)
        draftReady.current = true
        return
      }
      if (result === 'none') { if (!startedAsGuest.current) restoreDraft() }
      else if (result === 'exists') {
        // Edits to this application, saved before a reload: applied when "Edit" is clicked
        const id = existingIdRef.current
        if (id != null && usableDraft(id)) editDraftFor.current = id
        else clearApplicationDraft()
      }
      if (result !== 'failed') draftReady.current = true
    })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest])

  // Autosave: every change, shortly after the seller stops typing (this device only)
  const formVisible = (!existingApp || isEditing) && !loadFailed
  useEffect(() => {
    if (!draftReady.current || !formVisible || resuming) return
    const timer = setTimeout(() => saveApplicationDraft({
      step, form: { ...form }, pickup, categories: selectedCategories, subcategories: selectedSubcats,
      userId: getUser()?.id ?? null, appId: existingId,
    }), 400)
    return () => clearTimeout(timer)
  }, [step, form, pickup, selectedCategories, selectedSubcats, existingId, formVisible, resuming])

  // Pending subcategories (see pendingSubcats): applied once every selected category's list has loaded.
  useEffect(() => {
    const want = pendingSubcats.current
    if (!want) return
    if (want.length === 0) { pendingSubcats.current = null; return }
    // Wait for the restored categories and every one of their subcategory lists.
    if (!apiCategories.length || selectedCategories.length === 0) return
    if (selectedCategories.some(c => apiCategories.some(a => a.name === c) && !subcategoriesMap[c])) return
    pendingSubcats.current = null
    const valid = new Set(selectedCategories.flatMap(c => subcategoriesMap[c] ?? []).map(s => s.name))
    setSelectedSubcats(want.filter(s => valid.has(s)))
  }, [selectedCategories, subcategoriesMap, apiCategories])
  useEffect(() => { onApplication(existingApp) }, [existingApp, onApplication])

  const clearServerError = (key: string) =>
    setErrors(prev => { if (!(key in prev)) return prev; const n = { ...prev }; delete n[key]; return n })

  const handleChange = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      clearServerError(key)
      setProblem(null)
    }

  /** Leaving a field: check it gently (hint or ✓) and tidy what was typed. */
  const handleBlur = (key: keyof FormState) => () => {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }))
    setForm(prev => {
      const v = prev[key]
      // "+216 22-123-456" → "22123456"; spaces around any text trimmed
      const tidy = key === 'phone_number' && !checkPhone(v) ? normalizePhone(v) : v.trim()
      return tidy === v ? prev : { ...prev, [key]: tidy }
    })
  }

  // ── Photos: HEIC converted, heavy ones made lighter, before they are kept ──
  const noteFor = (r: PreparedImage): PhotoNote | undefined =>
    r.converted ? { kind: 'converted' } : r.reduced ? { kind: 'reduced' } : undefined

  const handleProfilePic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // picking the same photo again still triggers a change
    if (!file) return
    clearServerError('profile_picture')
    setProblem(null)
    setPhotosBusy(n => n + 1)
    try {
      const r = await prepareImage(file)
      setProfilePic(r.file)
      setProfilePicPreview(URL.createObjectURL(r.file))
      setProfilePicExisting(null)
      setPhotoNotes(p => ({ ...p, profile_picture: noteFor(r) }))
    } catch (err) {
      console.error('[seller application] profile picture could not be read', err)
      setPhotoNotes(p => ({ ...p, profile_picture: { kind: 'unreadable' } }))
    } finally {
      setPhotosBusy(n => n - 1)
    }
  }

  const handleSamples = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    clearServerError('sample_images')
    setProblem(null)
    // More than 5: keep the first ones instead of refusing them all
    const room = Math.max(0, LIMITS.samples - samples.length)
    const incoming = picked.slice(0, room)
    setPhotosBusy(n => n + 1)
    try {
      const results = await Promise.all(incoming.map(f => prepareImage(f).catch(err => {
        console.error('[seller application] product photo could not be read', err)
        return null
      })))
      const ready = results.filter((r): r is PreparedImage => r !== null)
      setSamples(prev => [
        ...prev,
        ...ready.map(r => ({ file: r.file, preview: URL.createObjectURL(r.file), caption: '', isExisting: false })),
      ].slice(0, LIMITS.samples))
      const note: PhotoNote | undefined =
        ready.length < results.length ? { kind: 'unreadable' }
        : picked.length > room ? { kind: 'kept', count: room }
        : ready.some(r => r.converted) ? { kind: 'converted' }
        : ready.some(r => r.reduced) ? { kind: 'reduced' }
        : undefined
      setPhotoNotes(p => ({ ...p, sample_images: note }))
    } finally {
      setPhotosBusy(n => n - 1)
    }
  }

  const removeSample   = (idx: number) => setSamples(prev => prev.filter((_, i) => i !== idx))
  const updateCaption  = (idx: number, caption: string) => {
    setSamples(prev => prev.map((s, i) => i === idx ? { ...s, caption } : s))
  }

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        const catSubs = subcategoriesMap[catName]?.map(s => s.name) ?? []
        setSelectedSubcats(ps => ps.filter(s => !catSubs.includes(s)))
        return prev.filter(c => c !== catName)
      }
      if (prev.length >= LIMITS.categories) return prev
      return [...prev, catName]
    })
    setTouched(prev => ({ ...prev, business_category: true }))
    clearServerError('business_category')
  }

  const toggleSubcat = (subcatName: string) => {
    setSelectedSubcats(prev =>
      prev.includes(subcatName) ? prev.filter(s => s !== subcatName) : [...prev, subcatName]
    )
  }

  // ── Guidance: same rules as the backend (lib/sellerApplication/normalize) ──

  const LINK_KIND = { facebook_url: 'facebook', instagram_url: 'instagram', website_url: 'website' } as const
  const linkCheck = (k: keyof typeof LINK_KIND) => checkLink(LINK_KIND[k], form[k])

  /** What a field still needs (null = fine), shown or not yet. */
  const issueOf = (key: string): Issue | null => {
    switch (key) {
      case 'full_name':            return checkFullName(form.full_name)
      case 'phone_number':         return checkPhone(form.phone_number)
      case 'business_name':        return checkBusinessName(form.business_name)
      case 'business_category':    return checkCategories(selectedCategories)
      case 'profile_picture':      return profilePic || profilePicExisting ? null : { code: 'pictureRequired', blocking: true }
      case 'sample_images':        return samples.length ? null : { code: 'samplesRequired', blocking: true }
      case 'business_description': return checkDescription(form.business_description)
      case 'facebook_url':
      case 'instagram_url':
      case 'website_url':          return linkCheck(key).issue
      default:                     return null
    }
  }

  /** The hint under a field: the server's words first, then ours once the field was left. */
  const hintOf = (key: string): string | null => {
    if (errors[key]) return errors[key]
    if (!touched[key]) return null
    const i = issueOf(key)
    return i ? tgd(i.code, i.values) : null
  }

  /** Green check: left once, filled in, nothing left to say. */
  const okOf = (key: string, filled: boolean) => !!touched[key] && filled && !errors[key] && !issueOf(key)

  /** "On utilisera : https://instagram.com/… ✓" under a valid link. */
  const linkSuccess = (k: keyof typeof LINK_KIND) => {
    if (!touched[k] || errors[k]) return null
    const { issue, value } = linkCheck(k)
    return !issue && value ? tgd('willUse', { value }) : null
  }

  const PICKUP_ORDER: (keyof PickupErrors)[] = ['adresse_complete', 'zone', 'pin', 'contact_name', 'phone', 'code_postal', 'indications']

  /** Fields that stop a step, in screen order. */
  const blockingFields = (s: 1 | 2 | 3): string[] => {
    if (s === 2) {
      const pe = { ...pickupErrors, ...validatePickupAddress(pickup) }
      return PICKUP_ORDER.filter(k => pe[k]).map(k => `pk:${k}`)
    }
    return STEP_FIELDS[s].filter(k => errors[k] || issueOf(k)?.blocking)
  }

  /**
   * Checks a step. Something missing: never a silent refusal — the seller is taken to
   * the first field to fix, which is highlighted softly with its hint.
   */
  const checkStep = (s: 1 | 2 | 3): boolean => {
    setTouched(prev => {
      const n = { ...prev }
      STEP_FIELDS[s].forEach(k => { n[k] = true })
      return n
    })
    if (s === 2) setPickupErrors(prev => ({ ...prev, ...validatePickupAddress(pickup) }))
    const blocking = blockingFields(s)
    if (blocking.length) { setGuideTarget({ key: blocking[0] }); return false }
    return true
  }

  // Scroll to the field to fix (after the step it lives on has rendered) and highlight it
  useEffect(() => {
    if (!guideTarget) return
    const target = guideTarget.key
    // A timer, not requestAnimationFrame: it also runs while the tab is in the background
    const timer = setTimeout(() => {
      setGuideTarget(null)
      const el = document.getElementById(GUIDE_DOM[target] ?? target)
      if (!el) return
      el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true })
      el.classList.remove('ct-flash')
      void el.offsetWidth   // restart the animation
      el.classList.add('ct-flash')
      setTimeout(() => el.classList.remove('ct-flash'), 2400)
    }, 30)
    return () => clearTimeout(timer)
  }, [guideTarget, step])

  const next = () => {
    if (!checkStep(step)) return
    // The contact for the courier defaults to the applicant
    if (step === 1) {
      setPickup(p => ({
        ...p,
        contact_name: p.contact_name || form.full_name.trim(),
        phone:        p.phone || normalizePhone(form.phone_number),
      }))
    }
    setStep(s => (s < 3 ? (s + 1) as 1|2|3 : s))
  }

  const changePickup = (v: PickupAddressValue) => {
    setPickup(v)
    setProblem(null)
    setPickupErrors(prev => {
      const now = validatePickupAddress(v)
      const next: PickupErrors = {}
      for (const k of Object.keys(prev) as (keyof PickupErrors)[]) if (now[k]) next[k] = prev[k]
      return next
    })
  }
  const prev = () => setStep(s => (s > 1 ? (s - 1) as 1|2|3 : s))

  // ── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (photosBusy > 0) { setProblem({ kind: 'photosBusy' }); return }
    // Every step again: a restored draft can open on step 3
    for (const s of [1, 2, 3] as const) {
      if (!checkStep(s)) { setStep(s); return }
    }
    // Guest: keep the draft, ask for an account; the application is sent once signed in.
    if (guest) {
      saveDraft()
      awaitingAuth.current = true
      onRequireAuth?.('register')
      return
    }
    setLoading(true); setProblem(null)
    // Read before the request: a new submission sets existingId on success.
    const wasUpdate = !!existingId
    try {
      const fd = new FormData()
      // Sent as the backend will store them (it normalizes the same way again)
      const values: Record<string, string> = {
        full_name:            form.full_name.trim(),
        phone_number:         normalizePhone(form.phone_number),
        business_name:        form.business_name.trim(),
        facebook_url:         linkCheck('facebook_url').value,
        instagram_url:        linkCheck('instagram_url').value,
        website_url:          linkCheck('website_url').value,
        pricing_range:        form.pricing_range,
        business_description: form.business_description.trim(),
      }
      Object.entries(values).forEach(([k, v]) => { if (v) fd.append(k, v) })
      Object.entries(pickupPayload(pickup)).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, String(v)) })
      fd.append('business_category', selectedCategories[0] ?? '')
      selectedCategories.forEach((cat, i) => fd.append(`business_categories[${i}]`, cat))
      selectedSubcats.forEach((sub, i)    => fd.append(`business_subcategories[${i}]`, sub))
      fd.append('preferred_plan', 'green')
      if (profilePic) fd.append('profile_picture', profilePic)
      samples.filter(s => !s.isExisting && s.file).forEach(s => fd.append('sample_images[]', s.file!))
      samples.forEach((s, i) => { if (s.caption.trim()) fd.append(`sample_captions[${i}]`, s.caption.trim()) })

      // Photos on a slow mobile connection: more time than the default 15 s
      const config = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }
      let response: { data?: { data?: ExistingApplication | null } }
      if (existingId) {
        // PHP only parses multipart bodies on POST: same PUT route via Laravel's _method override.
        fd.append('_method', 'PUT')
        response = await api.post(`/seller-applications/${existingId}`, fd, config)
      } else {
        response = await api.post('/seller-applications', fd, config)
      }

      // response.data is { success, data, message }: the application is at response.data.data
      const savedApp = response?.data?.data
      if (savedApp && typeof savedApp.id === 'number') {
        setExistingApp(savedApp)
        setExistingId(savedApp.id)
      }

      draftReady.current = false   // nothing left to save
      clearApplicationDraft()
      // Cached user learns the application is pending: the approval is then picked up without a re-login
      refreshUser()
      onSuccess(wasUpdate)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[] | string> } } }
      const status = e?.response?.status
      const body = e?.response?.data
      const fieldErrors = body?.errors && typeof body.errors === 'object' ? body.errors : null

      if (!e?.response) {
        // No answer: connection dropped or timed out. The draft is kept.
        console.error('[seller application] no response from the server', err)
        setProblem({ kind: 'network' })
      } else if (status === 413) {
        setProblem({ kind: 'tooLarge' })
      } else if (status === 422 && fieldErrors && Object.keys(fieldErrors).length) {
        // Each message goes under its field; the seller is taken to the first one
        const be: Record<string, string[]> = {}
        Object.entries(fieldErrors).forEach(([k, v]) => { be[k] = Array.isArray(v) ? v.map(String) : [String(v)] })
        const pe = pickupErrorsFromApi(be)
        const PICKUP_SERVER_KEYS = ['adresse_complete', 'intigo_zone_id', 'latitude', 'longitude', 'contact_name', 'phone', 'code_postal', 'indications']
        const mapped: Record<string, string> = {}
        Object.entries(be).forEach(([k, v]) => {
          if (PICKUP_SERVER_KEYS.includes(k)) return
          const f = fieldOfServerKey(k)
          if (!mapped[f]) mapped[f] = v[0]
        })
        setErrors(mapped)
        setPickupErrors(pe)
        const order = [...STEP_FIELDS[1], ...STEP_FIELDS[2], ...STEP_FIELDS[3]]
        const first = order.find(k => (k.startsWith('pk:') ? pe[k.slice(3) as keyof PickupErrors] : mapped[k]))
        if (first) {
          setStep(STEP_OF(first))
          setGuideTarget({ key: first })
          setProblem({ kind: 'fields' })
        } else {
          // A field the form doesn't show: say it in the banner
          setProblem({ kind: 'message', message: Object.values(mapped)[0] ?? tgd('fieldsToFix') })
        }
      } else if (status && status >= 500) {
        console.error('[seller application] server error', status, body, err)
        setProblem({ kind: 'server' })
      } else if (body?.message) {
        // Already translated by the server (pending application, too many attempts…)
        setProblem({ kind: 'message', message: body.message })
      } else {
        console.error('[seller application] unexpected response', status, body, err)
        setProblem({ kind: 'server' })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { submitRef.current = handleSubmit })

  // ── Derived ───────────────────────────────────────────────────────────

  const catLabel = (name: string) => apiCategories.find(c => c.name === name)?.label ?? name

  const availableSubcats: ApiSubcategory[] = selectedCategories.flatMap(cat => subcategoriesMap[cat] ?? [])

  // ─── FIX: showForm only when existingApp is genuinely null (no real application)
  // OR when user explicitly clicked Edit.
  // existingApp being null means: loaded and confirmed no application exists.
  const showForm = formVisible
  const needsReattach = restored && (!(profilePic || profilePicExisting) || samples.length === 0)

  return (
        <>
          {(resolvingAuth || resuming) && (
            <div role="status" aria-live="polite" style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(255,255,255,0.82)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24, textAlign:'center' }}>
              <BrandLoader variant="section" />
              <p style={{ margin:0, fontWeight:800, fontSize:'1rem', color:'#111' }}>{resuming ? tg('sendingTitle') : tg('checkingTitle')}</p>
              <p style={{ margin:0, fontSize:'0.85rem', color:'#6b7280', maxWidth:360 }}>{tg('sendingBody')}</p>
            </div>
          )}

          {!appLoading && loadFailed && (
            <div role="alert" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:16, padding:'16px 20px' }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', fontWeight:600, color:'#9a3412' }}>
                <AlertCircle size={16} aria-hidden="true" />{t('loadFailed')}
              </span>
              <button type="button" onClick={loadExistingApplication} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:999, border:'none', background:'#db142e', color:'#fff', fontSize:'0.8rem', fontWeight:800, cursor:'pointer' }}>
                <RefreshCw size={13} aria-hidden="true" />{t('retry')}
              </button>
            </div>
          )}

          {appLoading && (
            <div style={{ textAlign:'center', padding:'20px', color:'#9ca3af', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <BrandLoader variant="inline" size={16} />
              {t('loadingApplication')}
            </div>
          )}

          {/* ─── FIX: only show banner when existingApp has a real numeric id ─── */}
          {!appLoading && existingApp && typeof existingApp.id === 'number' && !isEditing && (
            <ApplicationStatusBanner
              app={existingApp}
              onEdit={() => {
                setIsEditing(true)
                // Edits saved before a reload come back (restoreDraft scrolls to the form)
                const restoredEdits = editDraftFor.current != null && restoreDraft(editDraftFor.current)
                editDraftFor.current = null
                if (!restoredEdits) setTimeout(scrollToForm, 100)
              }}
            />
          )}

          {!appLoading && showForm && (
            <div className="form-section">
              {/* Guest: account needed to send (not blocking) / restored draft: re-attach files */}
              {(guest || needsReattach) && (
                <div style={{ padding:'16px 28px 0', display:'flex', flexDirection:'column', gap:10 }}>
                  {guest && (
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'8px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'10px 14px' }}>
                      <UserPlus size={16} color="#198f41" aria-hidden="true" style={{ flexShrink:0 }} />
                      <span style={{ flex:'1 1 220px', fontSize:'0.8rem', color:'#166534', lineHeight:1.5 }}>{tg('notice')}</span>
                      <button type="button" onClick={() => { saveDraft(); awaitingAuth.current = false; onRequireAuth?.('login') }}
                        style={{ background:'none', border:'none', padding:0, fontSize:'0.78rem', fontWeight:800, color:'#198f41', textDecoration:'underline', cursor:'pointer', fontFamily:'inherit' }}>
                        {tg('loginLink')}
                      </button>
                    </div>
                  )}
                  {needsReattach && (
                    <div role="status" style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'10px 14px' }}>
                      <Paperclip size={16} color="#b45309" aria-hidden="true" style={{ flexShrink:0, marginTop:2 }} />
                      <span style={{ fontSize:'0.8rem', color:'#92400e', lineHeight:1.5 }}>{tg('reattach')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step indicator */}
              <div style={{ padding:'24px 28px', borderBottom:'1px solid #f0f0f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {([1,2,3] as const).map(s => (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div className="step-dot" style={{ background:step===s ? '#db142e' : step>s ? '#198f41' : '#f0f0f0', color:step>=s ? 'white' : '#999', boxShadow:step===s ? '0 4px 14px rgba(219,20,46,0.35)' : 'none' }}>
                        {step > s ? '✓' : s}
                      </div>
                      {s < 3 && <div style={{ height:2, width:36, background:step>s ? '#198f41' : '#e5e7eb', borderRadius:1, transition:'background 0.3s' }} />}
                    </div>
                  ))}
                  <span style={{ marginInlineStart:8, fontSize:'0.78rem', color:'#999', fontWeight:600 }}>
                    {step===1 ? t('steps.business') : step===2 ? t('steps.location') : t('steps.media')}
                  </span>
                </div>
              </div>

              <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:18 }}>

                {/* Completeness bar */}
                <div style={{ background:'#f8f8f6', borderRadius:12, padding:'14px 16px', border:'1px solid #e5e7eb' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151' }}>{t('completeness')}</span>
                    <span style={{ fontSize:'0.78rem', fontWeight:800, color:completenessColor }}>{completenessScore}%</span>
                  </div>
                  <div style={{ height:6, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, width:`${completenessScore}%`, background:completenessColor, transition:'width 0.4s ease, background 0.3s' }} />
                  </div>
                  <p style={{ fontSize:'0.72rem', color:'#9ca3af', marginTop:6, marginBottom:0 }}>💡 {completenessHint}</p>
                </div>

                {/* ══ STEP 1 ══ */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t('fields.fullName')} id="full_name" hint={hintOf('full_name')} ok={okOf('full_name', !!form.full_name.trim())}>
                        <div style={{ position:'relative' }}>
                          <input id="full_name" type="text" autoComplete="name" maxLength={LIMITS.name} placeholder={t('fields.fullNamePlaceholder')} value={form.full_name} onChange={handleChange('full_name')} onBlur={handleBlur('full_name')} aria-invalid={!!hintOf('full_name')} className={inputCls(hintOf('full_name')) + (namePrefilled ? ' pe-12' : '')} />
                          {namePrefilled && (
                            <div style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:3, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:99, padding:'2px 7px' }}>
                                <User size={9} color="#16a34a" />
                                <span style={{ fontSize:9, fontWeight:800, color:'#16a34a' }}>{t('auto')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Field>
                      <Field label={t('fields.phone')} id="phone_number" hint={hintOf('phone_number')} ok={okOf('phone_number', !!form.phone_number.trim())}
                        success={okOf('phone_number', !!form.phone_number.trim()) ? tgd('willUse', { value: formatPhone(normalizePhone(form.phone_number)) }) : null}>
                        <input id="phone_number" type="tel" dir="ltr" inputMode="tel" autoComplete="tel-national" placeholder="22 123 456" value={form.phone_number} onChange={handleChange('phone_number')} onBlur={handleBlur('phone_number')} aria-invalid={!!hintOf('phone_number')} className={inputCls(hintOf('phone_number'))} />
                      </Field>
                    </div>

                    <Field label={t('fields.businessName')} id="business_name" hint={hintOf('business_name')} ok={okOf('business_name', !!form.business_name.trim())}>
                      <input id="business_name" type="text" autoComplete="organization" maxLength={LIMITS.name} placeholder={t('fields.businessNamePlaceholder')} value={form.business_name} onChange={handleChange('business_name')} onBlur={handleBlur('business_name')} aria-invalid={!!hintOf('business_name')} className={inputCls(hintOf('business_name'))} />
                    </Field>

                    {/* Categories + Subcategories */}
                    <div className="flex flex-col gap-1.5" id="business_category" style={{ borderRadius:12 }}>
                      <label className="text-sm font-semibold text-gray-700">
                        {t('fields.categories')}
                        <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginInlineStart:6 }}>{t('fields.categoriesHint')}</span>
                      </label>
                      {categoriesLoading ? (
                        <BrandLoader variant="section" size="sm" label={t('loadingCategories')} />
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, maxHeight:240, overflowY:'auto', padding:4 }}>
                          {(apiCategories.length > 0 ? apiCategories.map(c => c.name) : FALLBACK_CATEGORIES).map(catName => {
                            const isSelected = selectedCategories.includes(catName)
                            return (
                              <button key={catName} type="button" onClick={() => toggleCategory(catName)} aria-pressed={isSelected}
                                style={{ padding:'8px 12px', borderRadius:10, textAlign:'start', fontSize:'0.78rem', fontWeight:isSelected ? 700 : 500, cursor:'pointer', border:isSelected ? '2px solid #db142e' : '1.5px solid #e5e7eb', background:isSelected ? '#fef2f2' : 'white', color:isSelected ? '#db142e' : '#374151', transition:'all 0.15s ease', display:'flex', alignItems:'center', gap:6 }}>
                                {isSelected && (
                                  <span style={{ width:14, height:14, borderRadius:'50%', background:'#db142e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <Check size={9} color="white" />
                                  </span>
                                )}
                                {catLabel(catName)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {selectedCategories.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                          {selectedCategories.map(c => (
                            <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#fef2f2', color:'#db142e', border:'1px solid #fecaca', borderRadius:999, padding:'2px 10px', fontSize:'0.72rem', fontWeight:700 }}>
                              {catLabel(c)}
                              <button type="button" onClick={() => toggleCategory(c)} aria-label={t('removeCategory', { name: catLabel(c) })} style={{ background:'none', border:'none', cursor:'pointer', color:'#db142e', padding:0, lineHeight:1, display:'flex' }}>
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <GuideLine hint={hintOf('business_category')} />

                      {selectedCategories.length > 0 && (
                        <div style={{ marginTop:12, background:'#f8f8f6', borderRadius:12, padding:'14px', border:'1px solid #e5e7eb' }}>
                          <p style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151', marginBottom:10 }}>
                            {t('fields.subcategories')}
                            <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginInlineStart:6 }}>{t('fields.subcategoriesHint')}</span>
                          </p>
                          {subcategoriesLoading && (
                            <div style={{ fontSize:'0.75rem', color:'#9ca3af', display:'flex', alignItems:'center', gap:6 }}>
                              <BrandLoader variant="inline" size={12} />{t('loadingSubcategories')}
                            </div>
                          )}
                          {!subcategoriesLoading && availableSubcats.length === 0 && (
                            <p style={{ fontSize:'0.75rem', color:'#9ca3af', margin:0 }}>{t('noSubcategories')}</p>
                          )}
                          {!subcategoriesLoading && availableSubcats.length > 0 && (
                            <>
                              {selectedCategories.map(catName => {
                                const subs = subcategoriesMap[catName] ?? []
                                if (subs.length === 0) return null
                                return (
                                  <div key={catName} style={{ marginBottom:12 }}>
                                    <p style={{ fontSize:'0.68rem', fontWeight:800, color:'#db142e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{catLabel(catName)}</p>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                      {subs.map(sub => {
                                        const isSelected = selectedSubcats.includes(sub.name)
                                        return (
                                          <button key={sub.id} type="button" onClick={() => toggleSubcat(sub.name)} aria-pressed={isSelected}
                                            className={`subcat-chip${isSelected ? ' selected' : ''}`}>
                                            {isSelected && <Check size={10} style={{ display:'inline', marginInlineEnd:3 }} />}
                                            {sub.label ?? sub.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                              {selectedSubcats.length > 0 && (
                                <p style={{ fontSize:'0.72rem', color:'#198f41', marginTop:6, fontWeight:600 }}>
                                  ✓ {t('subcategoriesSelected', { count: selectedSubcats.length })}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pricing range */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">
                        {t('fields.pricing')}
                        <span style={{ fontSize:'0.72rem', fontWeight:400, color:'#9ca3af', marginInlineStart:6 }}>({tc('optional')})</span>
                      </label>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                        {([
                          { value:'budget', label:t('pricing.budget'),  desc:t('pricing.budgetDesc'),  emoji:'💚' },
                          { value:'mid',    label:t('pricing.mid'),     desc:t('pricing.midDesc'),     emoji:'💛' },
                          { value:'premium',label:t('pricing.premium'), desc:t('pricing.premiumDesc'), emoji:'🖤' },
                        ] as const).map(opt => {
                          const isSelected = form.pricing_range === opt.value
                          return (
                            <button key={opt.value} type="button"
                              onClick={() => setForm(prev => ({ ...prev, pricing_range: prev.pricing_range === opt.value ? '' : opt.value }))}
                              aria-pressed={isSelected}
                              style={{ padding:'12px 10px', borderRadius:12, textAlign:'center', border:isSelected ? '2px solid #db142e' : '1.5px solid #e5e7eb', background:isSelected ? '#fef2f2' : 'white', cursor:'pointer', transition:'all 0.15s ease' }}>
                              <div style={{ fontSize:'1.2rem', marginBottom:4 }}>{opt.emoji}</div>
                              <div style={{ fontSize:'0.78rem', fontWeight:700, color:isSelected ? '#db142e' : '#374151' }}>{opt.label}</div>
                              <div style={{ fontSize:'0.68rem', color:'#9ca3af', marginTop:2 }}>{opt.desc}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ══ STEP 2 ══ */}
                {step === 2 && (
                  <>
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px' }}>
                      <p style={{ fontSize:'0.78rem', color:'#dc2626', fontWeight:600, margin:0 }}>{t('locationNote')}</p>
                    </div>
                    {/* Pickup address: Intigo's "Nouvelle adresse" fields (zone + map pin required) */}
                    <p style={{ fontSize:'0.78rem', color:'#6b7280', margin:0 }}>{tpa('subtitle')}</p>
                    <PickupAddressFields value={pickup} onChange={changePickup} errors={pickupErrors} disabled={loading} idPrefix="apply-pk" tone="guide" />
                  </>
                )}

                {/* ══ STEP 3 ══ */}
                {step === 3 && (
                  <>
                    {/* Profile picture */}
                    <div id="profile_picture" style={{ borderRadius:12 }}>
                      <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
                        {t('fields.picture')} <span style={{ color:'#db142e' }}>*</span>
                        <span style={{ color:'#9ca3af', fontWeight:400, fontSize:'0.78rem', marginInlineStart:4 }}>({tc('required')})</span>
                      </label>
                      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                        <div onClick={() => profileRef.current?.click()} role="button" tabIndex={0} aria-label={t('uploadPhoto')}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); profileRef.current?.click() } }}
                          style={{ width:72, height:72, borderRadius:16, border:hintOf('profile_picture') ? '2px dashed #f59e0b' : '2px dashed #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', background:hintOf('profile_picture') ? '#fffbeb' : '#fafafa', flexShrink:0 }}>
                          {profilePicPreview
                            ? <img src={profilePicPreview} alt={t('fields.picture')} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <Upload size={20} color={hintOf('profile_picture') ? '#f59e0b' : '#d1d5db'} />}
                        </div>
                        <div>
                          <button type="button" onClick={() => profileRef.current?.click()} style={{ color:'#db142e', fontWeight:700, fontSize:'0.85rem', background:'none', border:'none', cursor:'pointer' }}>
                            {profilePicPreview ? t('changePhoto') : t('uploadPhoto')}
                          </button>
                          <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'2px 0 0' }}>{t('photoHint')}</p>
                          {profilePicExisting && !profilePic && (
                            <p style={{ fontSize:'0.68rem', color:'#198f41', margin:'3px 0 0', fontWeight:600 }}>{t('photoLoaded')}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop:8 }}>
                        <PhotoGuide busy={photosBusy > 0 && !profilePic && !profilePicExisting} note={photoNotes.profile_picture} hint={hintOf('profile_picture')} />
                      </div>
                      <input ref={profileRef} type="file" accept="image/*,.heic,.heif" style={{ display:'none' }} onChange={handleProfilePic} />
                    </div>

                    {/* Product samples */}
                    <div id="sample_images" style={{ borderRadius:12 }}>
                      <label style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                        {t('fields.samples')} <span style={{ color:'#db142e' }}>*</span>
                        <span style={{ color:'#9ca3af', fontWeight:400, fontSize:'0.78rem', marginInlineStart:4 }}>{t('fields.samplesHint')}</span>
                      </label>
                      <p style={{ fontSize:'0.72rem', color:'#9ca3af', marginBottom:12, marginTop:0 }}>
                        {t('samplesIntro')}
                      </p>
                      {samples.length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                          {samples.map((s, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'#fafafa', border:s.isExisting ? '1.5px solid #bbf7d0' : '1.5px solid #e5e7eb', borderRadius:12, padding:10 }}>
                              <div style={{ width:60, height:60, flexShrink:0, borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb' }}>
                                <img src={s.preview} alt={t('captionFor', { n: i + 1 })} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                {s.isExisting && <p style={{ fontSize:'0.65rem', color:'#198f41', fontWeight:700, margin:'0 0 3px' }}>{t('existing')}</p>}
                                <input type="text" placeholder={t('captionFor', { n: i + 1 })} aria-label={t('captionFor', { n: i + 1 })} value={s.caption} onChange={e => updateCaption(i, e.target.value)} maxLength={LIMITS.caption}
                                  style={{ flex:1, fontSize:'0.78rem', padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', outline:'none', background:'white', color:'#374151', width:'100%' }} />
                              </div>
                              <button type="button" onClick={() => removeSample(i)} aria-label={t('removeImage')}
                                style={{ width:28, height:28, borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                                <X size={12} color="#dc2626" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {samples.length < 5 && (
                        <div onClick={() => samplesRef.current?.click()} role="button" tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); samplesRef.current?.click() } }}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:hintOf('sample_images') ? '2px dashed #f59e0b' : '2px dashed #e5e7eb', borderRadius:12, cursor:'pointer', background:hintOf('sample_images') ? '#fffbeb' : '#fafafa' }}>
                          <Upload size={16} color={hintOf('sample_images') ? '#f59e0b' : '#d1d5db'} />
                          <span style={{ fontSize:'0.78rem', color:hintOf('sample_images') ? '#92400e' : '#9ca3af' }}>
                            {samples.length === 0 ? t('uploadSamples') : t('addMore', { count: 5 - samples.length })}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop:8 }}>
                        <PhotoGuide busy={photosBusy > 0} note={photoNotes.sample_images} hint={hintOf('sample_images')} />
                      </div>
                      {samples.length >= 2 && (
                        <p style={{ fontSize:'0.72rem', color:'#198f41', marginTop:6, fontWeight:600 }}>{t('samplesBonus')}</p>
                      )}
                      <input ref={samplesRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display:'none' }} onChange={handleSamples} />
                    </div>

                    {/* Description — optional, moved to step 3 */}
                    <Field label={t('fields.description')} id="business_description" optional
                      hint={hintOf('business_description')} ok={okOf('business_description', !!form.business_description.trim())}>
                      <textarea id="business_description" rows={4}
                        placeholder={t('fields.descriptionPlaceholder')}
                        value={form.business_description}
                        onChange={handleChange('business_description')}
                        onBlur={handleBlur('business_description')}
                        className={inputCls(errors.business_description || issueOf('business_description')?.blocking ? hintOf('business_description') : null) + ' resize-none'}
                      />
                      <span style={{ fontSize:'0.72rem', color:form.business_description.length >= 50 ? '#198f41' : '#bbb', textAlign:'end' }}>
                        {form.business_description.length} / 2000{form.business_description.length >= 50 && ' ✓'}
                      </span>
                    </Field>

                    {/* Social media */}
                    <div>
                      <p style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151', marginBottom:12 }}>
                        {t('fields.social')} <span style={{ color:'#9ca3af', fontWeight:400 }}>({tc('optional')})</span>
                      </p>
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {([
                          ['facebook_url',  t('fields.facebook'),  tgd('placeholderFacebook')],
                          ['instagram_url', t('fields.instagram'), tgd('placeholderInstagram')],
                          ['website_url',   t('fields.website'),   tgd('placeholderWebsite')],
                        ] as const).map(([k, label, placeholder]) => (
                          <Field key={k} label={label} id={k} hint={hintOf(k)} ok={okOf(k, !!form[k].trim())} success={linkSuccess(k)}>
                            {/* type="text": "@boutique" or "boutique.tn" must not be refused by the browser */}
                            <input id={k} type="text" inputMode="url" dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                              maxLength={LIMITS.link} placeholder={placeholder} value={form[k]}
                              onChange={handleChange(k)} onBlur={handleBlur(k)} aria-invalid={!!hintOf(k)} className={inputCls(hintOf(k))} />
                          </Field>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {problem && (
                  <div role="status" aria-live="polite" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px' }}>
                    <span aria-hidden="true" style={{ flexShrink:0 }}>💡</span>
                    <p style={{ flex:'1 1 220px', fontSize:'0.8rem', color:'#92400e', margin:0, lineHeight:1.5 }}>
                      {problem.kind === 'message' ? problem.message : tgd(`submit.${problem.kind}`)}
                    </p>
                    {problem.kind === 'server' && (
                      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:'#198f41', color:'#fff', fontSize:'0.78rem', fontWeight:800, textDecoration:'none', flexShrink:0 }}>
                        <MessageCircle size={14} aria-hidden="true" />{tgd('submit.whatsapp')}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:'18px 28px', borderTop:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.75rem', color:'#9ca3af' }}>{t('stepOf', { n: step, total: 3 })}</span>
                <div style={{ display:'flex', gap:10 }}>
                  {step > 1 && (
                    <button type="button" onClick={prev} style={{ padding:'10px 20px', borderRadius:12, border:'1.5px solid #e5e7eb', fontSize:'0.82rem', fontWeight:700, color:'#555', background:'white', cursor:'pointer', fontFamily:'var(--ct-barlow),sans-serif' }}>
                      {t('back')}
                    </button>
                  )}
                  {step < 3 ? (
                    <button type="button" onClick={next} style={{ padding:'10px 24px', borderRadius:12, background:'#db142e', color:'white', fontSize:'0.82rem', fontWeight:800, border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(219,20,46,0.3)', fontFamily:'var(--ct-barlow),sans-serif' }}>
                      {t('continue')}
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit} disabled={loading}
                      style={{ padding:'10px 24px', borderRadius:12, background:loading ? '#d1d5db' : existingId ? '#0f172a' : '#198f41', color:'white', fontSize:'0.82rem', fontWeight:800, border:'none', cursor:loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--ct-barlow),sans-serif', transition:'all 0.2s' }}>
                      {loading
                        ? <><BrandLoader variant="inline" size={14} />{t('submitting')}</>
                        : existingId
                        ? <><RefreshCw size={14} />{t('update')}</>
                        : <>✓ {t('submit')}</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
  )
}
