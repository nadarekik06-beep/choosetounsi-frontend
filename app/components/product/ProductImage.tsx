'use client'

/**
 * next/image for product photos, with one fallback: when the optimized version
 * (/_next/image) fails, the browser loads the original file from the API instead.
 * The storefront server fetches photos from the API host; if that fetch fails
 * (DNS blip on 2026-11-06: cards stayed grey), shoppers still see the image.
 * onError only fires when the original file fails too.
 */

import { useEffect, useState, type ComponentProps } from 'react'
import Image from 'next/image'
import { isLocalImage } from '@/lib/imageHost'

type Props = Omit<ComponentProps<typeof Image>, 'src' | 'unoptimized'> & { src: string }

export default function ProductImage({ src, onError, ...rest }: Props) {
  const [direct, setDirect] = useState(isLocalImage(src))

  useEffect(() => { setDirect(isLocalImage(src)) }, [src])

  return (
    <Image {...rest} src={src} unoptimized={direct}
      onError={e => { if (!direct) setDirect(true); else onError?.(e) }} />
  )
}
