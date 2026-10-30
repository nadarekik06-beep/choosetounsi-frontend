/**
 * Draft of the seller "Add product" wizard, kept in the browser (IndexedDB, so the
 * chosen photos survive a refresh too). One draft per seller account on this device.
 * Every call is best-effort and never throws: private mode, blocked storage, a
 * stuck or failing database simply mean "no draft".
 */

const DB_NAME = 'ct-seller'
const STORE   = 'product-drafts'
/** A database that never answers (Safari can hang on open) must not hold the wizard. */
const TIMEOUT_MS = 4000

export interface ProductDraft {
  savedAt: number
  step: number
  form: Record<string, unknown>
  attrValues: Record<string, unknown>
  variantRows: unknown[]
  multicolorLabel: string
  /** New photos only (a new product has no saved ones) */
  images: { gallery: { uid: string; file: File }[]; colors: Record<string, { uid: string; file: File }[]> }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isPhotoList = (v: unknown) => Array.isArray(v) && v.every(x => isObj(x) && typeof x.uid === 'string' && x.file instanceof Blob)

/** True when a stored draft has the expected shape (anything else is discarded). */
export function isValidDraft(d: unknown): d is ProductDraft {
  if (!isObj(d)) return false
  return typeof d.savedAt === 'number'
    && typeof d.step === 'number' && Number.isFinite(d.step)
    && isObj(d.form)
    && isObj(d.attrValues)
    && Array.isArray(d.variantRows) && d.variantRows.every(r => isObj(r) && Array.isArray(r.option_ids))
    && typeof d.multicolorLabel === 'string'
    && isObj(d.images) && isPhotoList(d.images.gallery)
    && isObj(d.images.colors) && Object.values(d.images.colors).every(isPhotoList)
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('indexedDB timeout')), TIMEOUT_MS)
    p.then(v => { clearTimeout(id); resolve(v) }, e => { clearTimeout(id); reject(e) })
  })
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('no indexedDB')); return }
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('indexedDB blocked'))
    } catch (e) {
      reject(e)
    }
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  let db: IDBDatabase | null = null
  try {
    db = await withTimeout(open())
    const conn = db
    return await withTimeout(new Promise<T | null>((resolve) => {
      try {
        const tx = conn.transaction(STORE, mode)
        let result: T | null = null
        const req = fn(tx.objectStore(STORE))
        req.onsuccess = () => { result = req.result ?? null }
        req.onerror = (e) => { e.preventDefault(); resolve(null) }
        tx.oncomplete = () => resolve(result)
        tx.onabort = () => resolve(null)       // quota exceeded, etc.
        tx.onerror = () => resolve(null)
      } catch {
        resolve(null)                          // e.g. a File that can't be stored
      }
    }))
  } catch {
    return null
  } finally {
    try { db?.close() } catch { /* already closed */ }
  }
}

export const productDraft = {
  load: (key: string) => run<unknown>('readonly', (s) => s.get(key)),
  save: (key: string, draft: ProductDraft) => run('readwrite', (s) => s.put(draft, key)),
  clear: (key: string) => run('readwrite', (s) => s.delete(key)),
}
