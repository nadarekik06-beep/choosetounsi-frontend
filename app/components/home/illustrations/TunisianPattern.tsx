import { useId } from 'react'

/** Faint khatem (8-point star) lattice in the given colour; the host sets size and opacity via `className`. */
export default function TunisianPattern({ color, className = 'dcta-pattern' }: { color: string; className?: string }) {
  const id = `tn-pat-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.3">
            <rect x="18" y="18" width="20" height="20" />
            <rect x="18" y="18" width="20" height="20" transform="rotate(45 28 28)" />
            <path d="M0 0 l6 6 M56 0 l-6 6 M0 56 l6 -6 M56 56 l-6 -6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
