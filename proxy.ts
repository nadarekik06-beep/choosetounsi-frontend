import { NextResponse, type NextRequest } from 'next/server'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, negotiateLocale } from './i18n/config'

// First visit: detect fr/ar/en from the browser and remember it in NEXT_LOCALE.
// Routes stay locale-free (no /[locale]/ segment).
export function proxy(request: NextRequest) {
  if (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) return NextResponse.next()

  const locale = negotiateLocale(request.headers.get('accept-language'))
  // Make the detected locale visible to this very render, too.
  request.cookies.set(LOCALE_COOKIE, locale)
  const response = NextResponse.next({ request })
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: 'lax' })
  return response
}

export const config = {
  matcher: ['/((?!api|_next|.*\..*).*)'],
}
