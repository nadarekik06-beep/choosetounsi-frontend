// NEXT_PUBLIC_API_URL may be given with or without the trailing /api: API_URL is the bare host.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')
export const API_BASE = `${API_URL}/api`
export const STORAGE_URL = `${API_URL}/storage`
