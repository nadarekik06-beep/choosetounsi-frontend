import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/constants'

// Icons, /_next/ assets and the storefront stay crawlable; private areas are not worth indexing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/seller/', '/account/', '/checkout', '/orders', '/profile', '/notifications', '/complete-profile', '/onboarding', '/auth/', '/invoice/', '/settlement/', '/dev/'],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
