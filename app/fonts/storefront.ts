// Families that storefront pages and components reference as var(--ct-…). They used
// to be @import-ed from fonts.googleapis.com at runtime; now self-hosted (woff2 built
// from google/fonts, latin subset like Google's, OFL in ./licenses).
//
// preload: false  → a file downloads only when some text actually uses it (as before).
// adjustFontFallback: false → no extra metric-adjusted Arial face, so characters these
//   fonts don't have (Arabic…) fall through the rest of each font stack exactly as before.
import localFont from 'next/font/local'

// (next/font needs literal options: no shared object / spread)
export const barlow = localFont({
  display: 'swap', preload: false, adjustFontFallback: false,
  src: [
    { path: './barlow-400-latin.woff2', weight: '400', style: 'normal' },
    { path: './barlow-500-latin.woff2', weight: '500', style: 'normal' },
    { path: './barlow-600-latin.woff2', weight: '600', style: 'normal' },
    { path: './barlow-700-latin.woff2', weight: '700', style: 'normal' },
    { path: './barlow-800-latin.woff2', weight: '800', style: 'normal' },
    { path: './barlow-900-latin.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--ct-barlow',
})

export const barlowCondensed = localFont({
  display: 'swap', preload: false, adjustFontFallback: false,
  src: [
    { path: './barlow-condensed-600-latin.woff2', weight: '600', style: 'normal' },
    { path: './barlow-condensed-700-latin.woff2', weight: '700', style: 'normal' },
    { path: './barlow-condensed-800-latin.woff2', weight: '800', style: 'normal' },
    { path: './barlow-condensed-900-latin.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--ct-barlow-c',
})

// Variable font; optical size pinned at 14 like the file Google served (not the 9pt default).
// Same file, two face sets that mirror the weights each page used to request from
// Google (a weight that was not requested fell back to the nearest requested one):
// 400-800 for addresses, complaints/new and the profile pages; 400 + 600-900 for /complaints.
export const dmSans = localFont({ display: 'swap', preload: false, adjustFontFallback: false, src: './dm-sans-latin.woff2', weight: '400 800', variable: '--ct-dm-sans' })
export const dmSansComplaints = localFont({
  display: 'swap', preload: false, adjustFontFallback: false,
  src: [
    { path: './dm-sans-latin.woff2', weight: '400', style: 'normal' },
    { path: './dm-sans-latin.woff2', weight: '600 900', style: 'normal' },
  ],
  variable: '--ct-dm-sans-complaints',
})
export const dmSerifDisplay = localFont({ display: 'swap', preload: false, adjustFontFallback: false, src: './dm-serif-display-400-latin.woff2', weight: '400', variable: '--ct-dm-serif' })
export const outfit = localFont({ display: 'swap', preload: false, adjustFontFallback: false, src: './outfit-latin.woff2', weight: '300 900', variable: '--ct-outfit' })

/** Class names that define every --ct-… font variable (set on <html>). */
export const storefrontFontVars = [barlow, barlowCondensed, dmSans, dmSansComplaints, dmSerifDisplay, outfit].map(f => f.variable).join(' ')
