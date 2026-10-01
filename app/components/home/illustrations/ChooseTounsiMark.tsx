import { useId } from 'react'

/**
 * Choose'Tounsi mark (chili pepper riding a shopping cart), redrawn as SVG from
 * public/images/logo-chili.png so each part can move on its own:
 *   .ctm-cart   rolls forward/back      .ctm-wheel  spins with the roll
 *   .ctm-pepper wiggles from its stem   .ctm-stem   sways from its base
 * Rendered as a nested <svg> (own 120×100 viewport) so transform origins are in logo units.
 */

const RED = '#db142e'
const GREEN = '#198f41'

interface ChooseTounsiMarkProps {
  x: number
  y: number
  width: number
}

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="ctm-wheel">
      <circle cx={cx} cy={cy} r="5.2" fill="#fff" stroke={GREEN} strokeWidth="4" />
      <circle cx={cx + 2.4} cy={cy - 1.2} r="1" fill={GREEN} />
    </g>
  )
}

export default function ChooseTounsiMark({ x, y, width }: ChooseTounsiMarkProps) {
  const gid = `ctm-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg x={x} y={y} width={width} height={width * (100 / 120)} viewBox="0 0 120 100" overflow="visible" className="ctm">
      <defs>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d5f" />
          <stop offset=".5" stopColor={RED} />
          <stop offset="1" stopColor="#a50f22" />
        </linearGradient>
        <linearGradient id={`${gid}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fb45d" />
          <stop offset="1" stopColor="#127536" />
        </linearGradient>
      </defs>

      <g className="ctm-cart">
        <g fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          {/* handle + slanted left side + bottom rail */}
          <path d="M15 25 H25 L38 70 Q39.5 77 46 77 H97" />
          {/* left rungs (mostly tucked behind the pepper) */}
          <path d="M29 37 H40 M31.5 45.5 H42 M34 54 H43 M36.5 62.5 H45" />
          {/* right basket grid */}
          <path d="M74 34 H101 L97 70 H74" />
          <path d="M85 34 L84 70 M93 34 L91 70 M74 43 H100 M74 52 H99 M74 61 H98" strokeWidth="4" />
        </g>
        <circle cx="15" cy="25" r="3.6" fill={GREEN} />
        <Wheel cx={44} cy={88} />
        <Wheel cx={86} cy={88} />
      </g>

      <g className="ctm-pepper">
        <path d="M46 27 C52 22 68 22 75 28 C77 38 75 48 76 55 C78 66 88 76 102 80 C80 85 56 79 47 64 C40 52 40 36 46 27Z"
          fill={`url(#${gid}-body)`} stroke="#8a0c1d" strokeWidth=".8" strokeLinejoin="round" />
        {/* the mark's white "=" stripes + gloss */}
        <path d="M50 41 H69 M50 50.5 H66" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M72 62 C77 71 86 76 96 78.5" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="70.5" cy="33" rx="1.6" ry="2.6" fill="#fff" transform="rotate(-15 70.5 33)" />
        <g className="ctm-stem">
          <path d="M60 24 C60 15 57 9.5 49.5 7.5" fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
        </g>
        <path d="M45 29 Q48 20 55 22.5 Q60 17 65 22.5 Q72 20 75.5 29 Q68 25.5 60 27.5 Q52 25.5 45 29Z"
          fill={`url(#${gid}-leaf)`} />
      </g>
    </svg>
  )
}

export const MARK_CSS = `
  .ctm-cart   { transform-box: view-box; animation: ctmRoll 4s cubic-bezier(.45,0,.55,1) infinite; }
  .ctm-wheel  { transform-box: fill-box; transform-origin: center; animation: ctmSpin 4s cubic-bezier(.45,0,.55,1) infinite; }
  .ctm-pepper { transform-box: view-box; transform-origin: 60px 26px; animation: ctmWiggle 3.6s ease-in-out infinite; }
  .ctm-stem   { transform-box: view-box; transform-origin: 60px 24px; animation: ctmStem 3.6s ease-in-out infinite; }
  @keyframes ctmRoll   { 0%,100% { transform: translateX(0) } 40% { transform: translateX(3px) } 60% { transform: translateX(3px) } }
  @keyframes ctmSpin   { 0%,100% { transform: rotate(0deg) } 40%,60% { transform: rotate(120deg) } }
  @keyframes ctmWiggle {
    0%,100% { transform: translateY(0) rotate(0deg) }
    20% { transform: translateY(-2px) rotate(-4deg) }
    40% { transform: translateY(0) rotate(3deg) }
    55% { transform: translateY(-1px) rotate(-1.5deg) }
    70% { transform: translateY(0) rotate(0deg) }
  }
  @keyframes ctmStem { 0%,100% { transform: rotate(0deg) } 25% { transform: rotate(9deg) } 50% { transform: rotate(-7deg) } 75% { transform: rotate(3deg) } }
`
