/**
 * Draft of the seller "Add product" wizard, kept in the browser (IndexedDB, so the
 * chosen photos survive a refresh too). One draft per seller account on this device.
 * Every call is best-effort: private mode / blocked storage simply means no draft.
 */

const DB_NAME = 'ct-seller'
const STORE   = 'product-drafts'

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

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open()
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

export const productDraft = {
  load: (key: string) => run<ProductDraft>('readonly', (s) => s.get(key)),
  save: (key: string, draft: ProductDraft) => run('readwrite', (s) => s.put(draft, key)),
  clear: (key: string) => run('readwrite', (s) => s.delete(key)),
}
