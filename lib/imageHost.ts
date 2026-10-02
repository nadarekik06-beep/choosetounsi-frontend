// Next 16's image optimizer refuses local / private-network sources (SSRF guard).
// In development the API (and its /storage) runs on localhost, so those images
// skip the optimizer; a public API host in production still gets resized WebP/AVIF.

const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/

export function isLocalImage(src: string | null | undefined): boolean {
  if (!src) return false
  try {
    return PRIVATE_HOST.test(new URL(src).hostname)
  } catch {
    return false
  }
}
