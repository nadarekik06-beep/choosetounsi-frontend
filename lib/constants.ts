// The one place that knows where the Laravel API lives. Every API call and /storage URL goes through here.
// NEXT_PUBLIC_API_URL is the API origin without /api (production: https://api.choosetounsi.tn);
// a trailing /api is tolerated and stripped. Unset → the local `php artisan serve` on :8000.
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')
export const API_BASE = `${API_ORIGIN}/api`
export const STORAGE_URL = `${API_ORIGIN}/storage`

/** apiUrl('/products?page=2') → https://api.choosetounsi.tn/api/products?page=2 */
export const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
