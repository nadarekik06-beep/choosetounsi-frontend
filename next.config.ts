import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { API_ORIGIN } from './lib/constants';


const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Product images are served by the Laravel API's /storage: allow the host
// NEXT_PUBLIC_API_URL points at (see lib/constants.ts; localhost:8000 when unset).
const apiStorage = (() => {
  try {
    const u = new URL(API_ORIGIN);
    return [{
      protocol: u.protocol.replace(':', '') as 'http' | 'https',
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: '/storage/**',
    }];
  } catch {
    return [];
  }
})();

// Shared store links, QR codes and Open Graph tags are built from this (see lib/storeLink.ts)
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn('\n⚠ NEXT_PUBLIC_SITE_URL is not set: shared store links will fall back to the request origin.\n')
}

const nextConfig: NextConfig = {
  // The Black Pepper "AI Intelligence" and "Intelligent Promotion" pages were replaced by Growth Radar
  async redirects() {
    return [
      { source: '/seller/black/ai-intelligence',  destination: '/seller/growth-radar', permanent: true },
      { source: '/seller/black/smart-promotions', destination: '/seller/growth-radar', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        // Google profile photos — covers lh3.googleusercontent.com etc.
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh1.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh2.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
      ...apiStorage,
    ],
  },
};

export default withNextIntl(nextConfig);