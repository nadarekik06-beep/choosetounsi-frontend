import type { PickupAddressValue } from '@/lib/pickupAddress'

/**
 * Application draft, saved in localStorage on every change so a reload, a closed
 * tab or the sign-in round trip (Google) never loses the seller's answers.
 * Files can't be stored: the applicant re-attaches them (the form says so).
 * Cleared after a successful submission.
 */
const DRAFT_KEY = 'ct_vendor_apply_draft'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface ApplicationDraft {
  savedAt: number
  step: 1 | 2 | 3
  form: Record<string, string>
  pickup: PickupAddressValue
  categories: string[]
  subcategories: string[]
  /** Who filled it (null = guest, kept when they sign in). */
  userId?: number | null
  /** The application being edited (null = a new application). */
  appId?: number | null
}

export function saveApplicationDraft(draft: Omit<ApplicationDraft, 'savedAt'>): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })) } catch {}
}

export function readApplicationDraft(): ApplicationDraft | null {
  try {
    // sessionStorage: drafts saved before the switch to localStorage
    const raw = localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as ApplicationDraft
    if (!d || typeof d.savedAt !== 'number' || Date.now() - d.savedAt > MAX_AGE_MS || !d.form || !d.pickup) {
      clearApplicationDraft()
      return null
    }
    return d
  } catch { return null }
}

export function clearApplicationDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}
