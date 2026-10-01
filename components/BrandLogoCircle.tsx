import Image from 'next/image'
import type { CSSProperties } from 'react'

/**
 * Choose'Tounsi mark (cart + pepper) centred in a white circle.
 * Uses /images/logo-mark.png: a square, transparent, tightly cropped
 * version of logo-chili.png, so the mark centres optically at any size.
 */
export default function BrandLogoCircle({
  size,
  alt = '',
  ratio = 0.7,
  ring,
  imageStyle,
  style,
  className,
}: {
  size: number
  alt?: string
  /** Mark size relative to the circle (0–1). */
  ratio?: number
  /** Optional border, e.g. `1.5px solid #198f41`. */
  ring?: string
  imageStyle?: CSSProperties
  style?: CSSProperties
  className?: string
}) {
  const mark = Math.round(size * ratio)
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        border: ring,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Image
        src="/images/logo-mark.png"
        alt={alt}
        width={mark}
        height={mark}
        style={{ width: mark, height: mark, objectFit: 'contain', display: 'block', ...imageStyle }}
      />
    </span>
  )
}
