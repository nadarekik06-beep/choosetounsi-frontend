import { useId } from 'react'

/**
 * Glossy chili in the section's flat-outline style.
 * `PepperShape` is the raw <g> (drawn in a 40×40 box centred on 0,0) so SVG scenes can
 * embed it; `AnimatedPepper` wraps it in its own floating <svg> for HTML placement.
 */

const PALETTE = {
  red:   { light: '#ff5a6e', mid: '#db142e', dark: '#a50f22', stem: '#198f41', cap: '#22a04d' },
  green: { light: '#4fd37f', mid: '#198f41', dark: '#0f6b30', stem: '#4d5b1a', cap: '#3f7d1f' },
} as const

export type PepperColor = keyof typeof PALETTE

export function PepperShape({ color = 'red' }: { color?: PepperColor }) {
  const c = PALETTE[color]
  const gid = `pep-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset=".45" stopColor={c.mid} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* body: plump shoulder curling into a pointed tail */}
      <path d="M-7 -9 C-1 -13 7 -12 8 -6 C9.5 1 7 9 0 14 C-4 17 -10 18 -14 17 C-8 13 -6 8 -7 2 C-8 -3 -10 -6 -7 -9Z"
        fill={`url(#${gid})`} stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
      {/* gloss */}
      <path d="M3 -6 C4.5 -1 3.5 5 -0.5 9.5" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.2" cy="-8.6" r="1.1" fill="#fff" fillOpacity=".8" />
      {/* calyx + curved stem */}
      <path d="M-8 -9 Q-5 -14 -1 -12 Q2 -15 5 -12 Q8 -13 8.5 -7 Q4 -10 0 -9 Q-4 -10 -8 -9Z"
        fill={c.cap} stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M0 -12.5 C0.5 -16 3 -18.5 7 -18" fill="none" stroke={c.stem} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  )
}

interface AnimatedPepperProps {
  color?: PepperColor
  size?: number
  /** Loop offset in seconds (negative starts mid-loop). */
  delay?: number
  /** Resting tilt in degrees. */
  rotate?: number
  className?: string
  style?: React.CSSProperties
}

export default function AnimatedPepper({ color = 'red', size = 28, delay = 0, rotate = 0, className = '', style }: AnimatedPepperProps) {
  return (
    <svg
      width={size} height={size} viewBox="-20 -20 40 40"
      className={`apep ${className}`} aria-hidden="true" focusable="false"
      style={{ '--r': `${rotate}deg`, animationDelay: `${delay}s`, ...style } as React.CSSProperties}
    >
      <PepperShape color={color} />
    </svg>
  )
}

/** Keyframes for `.apep`; rendered once by the section that places the peppers. */
export const PEPPER_CSS = `
  .apep {
    position: absolute; z-index: 1; pointer-events: none; overflow: visible;
    transform: rotate(var(--r));
    animation: apepFloat 6.5s ease-in-out infinite both;
    filter: drop-shadow(0 6px 6px rgba(17,17,17,.12));
  }
  @keyframes apepFloat {
    0%,100% { transform: translateY(0) rotate(var(--r)); }
    35%     { transform: translateY(-9px) rotate(calc(var(--r) + 9deg)); }
    70%     { transform: translateY(-3px) rotate(calc(var(--r) - 6deg)); }
  }
`
