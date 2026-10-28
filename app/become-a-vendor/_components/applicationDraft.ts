import type { PickupAddressValue } from '@/lib/pickupAddress'

/**
 * Guest application draft, kept in sessionStorage (this tab only) while the
 * visitor signs in. Files can't be stored: they stay in memory for the in-page
 * modal, and must be re-attached after a full-page redirect (Google).
 */
const DRAFT_KEY = 'ct_vendor_apply_draft'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface ApplicationDraft {
  savedAt: number
  step: 1 | 2 | 3
  form: Record<string, string>
  pickup: PickupAddressValue
  categories: string[]
  subcategories: string[]
}

export function saveApplicationDraft(draft: Omit<ApplicationDraft, 'savedAt'>): void {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })) } catch {}
}

export function readApplicationDraft(): ApplicationDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
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
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}
