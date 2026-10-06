/**
 * lib/storeLink.ts
 *
 * Public links to a seller's storefront. Sellers have no slug column, so the
 * clean URL is `/sellers/{id}-{store-name}`: the id keeps it unique and stable
 * when the store is renamed, the name makes it readable. `/sellers/{id}` keeps
 * working — parseSellerId() reads the leading id from either form.
 *
 * Safe to import from server and client code.
 */

const isDev = process.env.NODE_ENV !== 'production'

const trimSlash = (u: string) => u.replace(/\/+$/, '')

/**
 * Public origin of the site (no trailing slash), from NEXT_PUBLIC_SITE_URL.
 * On the server, `requestOrigin` (from the request headers) covers a missing
 * variable; in the browser, window.location.origin is only used in dev.
 */
export function siteUrl(requestOrigin?: string | null): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL
  if (env) return trimSlash(env)
  if (typeof window !== 'undefined') {
    if (!isDev) console.error('[storeLink] NEXT_PUBLIC_SITE_URL is not set: shared links use the current origin.')
    return window.location.origin
  }
  return trimSlash(requestOrigin ?? '')
}

/** "Épicerie Fine Sfax" → "epicerie-fine-sfax"; Arabic and other scripts are kept as-is. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Path of a storefront: /sellers/12-epicerie-fine-sfax (or /sellers/12 without a name). */
export function storePath(id: number | string, name?: string | null): string {
  const slug = name ? slugify(name) : ''
  return `/sellers/${id}${slug ? `-${slug}` : ''}`
}

/** Absolute storefront URL, for sharing, QR codes and canonical tags. */
export function storeUrl(id: number | string, name?: string | null, requestOrigin?: string | null): string {
  return `${siteUrl(requestOrigin)}${storePath(id, name)}`
}

/** Seller id from a route segment: "12", "12-epicerie-fine-sfax" → 12. */
export function parseSellerId(segment: string | undefined | null): number | null {
  const m = /^(\d+)(?:-|$)/.exec(decodeURIComponent(segment ?? ''))
  return m ? Number(m[1]) : null
}

/** Share-intent links that open in a new tab when the Web Share API is missing. */
export function shareIntents(url: string, text: string) {
  const u = encodeURIComponent(url)
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    // The web Send dialog needs a Facebook app id; without one only the mobile app link works.
    messenger: fbAppId
      ? `https://www.facebook.com/dialog/send?app_id=${fbAppId}&link=${u}&redirect_uri=${u}`
      : `fb-messenger://share/?link=${u}`,
    messengerNeedsApp: !fbAppId,
    x: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(text)}`,
  }
}

/** Copy text to the clipboard, with the execCommand fallback for older browsers / non-HTTPS. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
