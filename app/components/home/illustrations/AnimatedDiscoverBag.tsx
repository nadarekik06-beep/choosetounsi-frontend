/**
 * Buyer-door hero: an open shopping bag out of which Tunisian goods float up and loop
 * (chéchia, Nabeul pottery, olive branch, jasmine, belgha slipper, chilies).
 * The front carries a stitched label with the animated Choose'Tounsi mark; hovering the
 * host panel pops the label and bursts sparkles (rules in DualCTASection: .adb-label/.adb-burst).
 * Pure inline SVG + CSS. Only transform/opacity are animated; the parent pauses
 * everything off-screen and the reduced-motion rules freeze items in a static bouquet.
 */

import ChooseTounsiMark, { MARK_CSS } from './ChooseTounsiMark'
import { PepperShape } from './AnimatedPepper'

const INK = '#111'
const RED = '#db142e'
const RED_DARK = '#a50f22'
const RED_DEEP = '#6f0a17'
const GREEN = '#198f41'

function Chechia() {
  return (
    <g>
      <path d="M-15 11 L-12 -7 Q0 -13 12 -7 L15 11 Q0 16 -15 11Z" fill={RED} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="0" cy="-8" rx="12" ry="3.5" fill="#f0364d" stroke={INK} strokeWidth="2" />
      <path d="M0 -9 Q9 -9 13 2" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 1 l4 9 M13 1 l1 10 M15 1 l-1 9" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

function Vase() {
  return (
    <g>
      <path d="M-6 -17 h12 v4 q-2 2 -1 5 q12 6 10 17 q-2 10 -15 10 q-13 0 -15 -10 q-2 -11 10 -17 q1 -3 -1 -5z"
        fill="#d9622b" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-11 3 h22" stroke="#fff7ed" strokeWidth="5" />
      <path d="M-11 3 l3.6 -2 3.7 2 3.7 -2 3.7 2 3.7 -2 3.6 2" fill="none" stroke="#1d4ed8" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="0" cy="12" r="2" fill="#1d4ed8" />
    </g>
  )
}

function OliveBranch() {
  return (
    <g>
      <path d="M-16 13 Q-2 2 16 -14" fill="none" stroke="#4d5b1a" strokeWidth="2.2" strokeLinecap="round" />
      {[[-9, 6, -35], [-2, 0, 30], [5, -5, -40], [11, -10, 25]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry="3" transform={`rotate(${r} ${x} ${y})`} fill={GREEN} stroke={INK} strokeWidth="1.5" />
      ))}
      <ellipse cx="-4" cy="10" rx="3" ry="4" fill="#3f3f46" stroke={INK} strokeWidth="1.4" />
      <ellipse cx="7" cy="3" rx="3" ry="4" fill="#65a30d" stroke={INK} strokeWidth="1.4" />
    </g>
  )
}

function Jasmine() {
  return (
    <g>
      {[0, 72, 144, 216, 288].map(r => (
        <ellipse key={r} cx="0" cy="-8" rx="5.5" ry="9" transform={`rotate(${r})`} fill="#fff" stroke={INK} strokeWidth="1.6" />
      ))}
      <circle r="4" fill="#facc15" stroke={INK} strokeWidth="1.6" />
    </g>
  )
}

function Belgha() {
  return (
    <g>
      <path d="M-19 6 Q-19 -5 -6 -7 Q9 -9 19 2 Q11 9 -4 9 Q-15 10 -19 6Z" fill="#eab308" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-17 7 Q0 12 18 3" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" />
      <path d="M-4 -6 q3 5 9 5" fill="none" stroke="#fff7ed" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

const RedPepper = () => <PepperShape color="red" />
const GreenPepper = () => <PepperShape color="green" />

/* Each item: x at the bag opening, drift/rotation for the loop, static spot for reduced motion. */
const ITEMS = [
  { x: 120, dx: -40, rot: -18, sx: -30, sy: -70, delay: 0, Icon: Chechia },
  { x: 134, dx: -22, rot: 30, sx: -38, sy: -118, delay: -1, Icon: RedPepper },
  { x: 148, dx: -10, rot: 12, sx: -6, sy: -112, delay: -2, Icon: Jasmine },
  { x: 164, dx: 4, rot: -8, sx: 6, sy: -60, delay: -3, Icon: Vase },
  { x: 180, dx: 18, rot: -34, sx: 26, sy: -132, delay: -4, Icon: GreenPepper },
  { x: 194, dx: 28, rot: 22, sx: 36, sy: -100, delay: -5, Icon: OliveBranch },
  { x: 210, dx: 46, rot: -14, sx: 46, sy: -54, delay: -6, Icon: Belgha },
]

/* Hover burst around the label: position + outward push */
const BURSTS = [
  { x: 114, y: 178, bx: -12, by: -12, c: '#facc15' },
  { x: 210, y: 184, bx: 12, by: -10, c: '#fff' },
  { x: 206, y: 258, bx: 12, by: 10, c: '#facc15' },
]

function Sparkle({ x, y, s = 1, delay = 0, color = '#facc15' }: { x: number; y: number; s?: number; delay?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="adb-spark" style={{ animationDelay: `${delay}s` }}
        d="M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8Z" fill={color} />
    </g>
  )
}

export default function AnimatedDiscoverBag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={`adb ${className}`} aria-hidden="true" focusable="false">
      <style>{`
        .adb-bag, .adb-shadow, .adb-item, .adb-spark, .adb-tag, .adb-label, .adb-burst, .adb-shine { transform-box: fill-box; transform-origin: center; }
        .adb-label { transition: transform .55s cubic-bezier(.34,1.56,.64,1); }
        .adb-shine { animation: adbShine 4.5s ease-in-out infinite; }
        .adb-burst { opacity: 0; }
        @keyframes adbShine { 0%,62% { transform: translateX(0) skewX(-20deg); opacity: 0 } 66% { opacity: .85 } 86%,100% { transform: translateX(130px) skewX(-20deg); opacity: 0 } }
        @keyframes adbBurst {
          0%   { opacity: 0; transform: translate(0,0) scale(.2) rotate(0deg); }
          35%  { opacity: 1; transform: translate(calc(var(--bx) * .6), calc(var(--by) * .6)) scale(1.2) rotate(45deg); }
          100% { opacity: 0; transform: translate(var(--bx), var(--by)) scale(.4) rotate(90deg); }
        }
        ${MARK_CSS}
        .adb-bag { animation: adbBob 4.8s ease-in-out infinite; }
        .adb-shadow { animation: adbShadow 4.8s ease-in-out infinite; }
        .adb-item {
          transform: translate(var(--sx), var(--sy)) rotate(var(--rot));
          animation: adbRise 7s cubic-bezier(.3,.6,.4,1) infinite both;
        }
        .adb-spark { animation: adbTwinkle 2.6s ease-in-out infinite both; }
        .adb-tag { transform-origin: 50% 0; animation: adbTag 3.2s ease-in-out infinite; }
        @keyframes adbBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes adbShadow { 0%,100% { transform: scaleX(1); opacity: .9 } 50% { transform: scaleX(.9); opacity: .6 } }
        @keyframes adbRise {
          0%   { opacity: 0; transform: translate(0, 36px) scale(.35) rotate(0deg); }
          12%  { opacity: 1; }
          55%  { transform: translate(var(--dx), -84px) scale(1) rotate(var(--rot)); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(var(--dx) * 1.35), -124px) scale(.85) rotate(calc(var(--rot) * 1.6)); }
        }
        @keyframes adbTwinkle { 0%,100% { opacity: .15; transform: scale(.5) } 50% { opacity: 1; transform: scale(1) } }
        @keyframes adbTag { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(8deg) } }
      `}</style>

      <defs>
        <clipPath id="adb-label-clip"><rect x="116" y="175" width="88" height="76" rx="13" /></clipPath>
        <linearGradient id="adb-label-inset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity=".09" />
          <stop offset=".18" stopColor={INK} stopOpacity="0" />
          <stop offset=".88" stopColor={INK} stopOpacity="0" />
          <stop offset="1" stopColor={INK} stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="adb-shine-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse className="adb-shadow" cx="166" cy="290" rx="96" ry="10" fill={INK} fillOpacity=".1" />

      <Sparkle x={62} y={96} s={1.1} delay={0} />
      <Sparkle x={262} y={78} s={0.9} delay={-0.9} color={RED} />
      <Sparkle x={278} y={196} s={0.7} delay={-1.7} color={GREEN} />
      <Sparkle x={44} y={206} s={0.7} delay={-2.2} color={RED} />
      <circle cx="84" cy="150" r="3" fill={GREEN} opacity=".5" />
      <circle cx="252" cy="120" r="2.5" fill={RED} opacity=".45" />

      <g className="adb-bag">
        {/* back handle + open mouth of the bag */}
        <path d="M150 142 C150 94 226 94 226 142" fill="none" stroke={RED_DEEP} strokeWidth="6" strokeLinecap="round" />
        <path d="M96 152 L126 136 L254 140 L226 152Z" fill={RED_DEEP} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />

        {/* goods rising out of the bag (drawn before the front panel so they start hidden inside) */}
        {ITEMS.map(({ x, dx, rot, sx, sy, delay, Icon }, i) => (
          <g key={i} transform={`translate(${x} 150)`}>
            <g className="adb-item" style={{
              '--dx': `${dx}px`, '--rot': `${rot}deg`, '--sx': `${sx}px`, '--sy': `${sy}px`, animationDelay: `${delay}s`,
            } as React.CSSProperties}>
              <Icon />
            </g>
          </g>
        ))}

        {/* side + front panels */}
        <path d="M226 152 L254 140 L264 258 L238 274Z" fill={RED_DARK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M96 152 L226 152 L238 274 L84 274Z" fill={RED} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M95 164 L227 164" stroke="#fff" strokeOpacity=".22" strokeWidth="7" />
        {/* stitched label carrying the Choose'Tounsi mark */}
        <g className="adb-label">
          <rect x="117" y="179" width="88" height="76" rx="13" fill={RED_DEEP} opacity=".35" />
          <rect x="116" y="175" width="88" height="76" rx="13" fill="#fff" stroke={INK} strokeWidth="2" />
          <rect x="117" y="176" width="86" height="74" rx="12" fill="url(#adb-label-inset)" />
          <rect x="121.5" y="180.5" width="77" height="65" rx="9" fill="none" stroke={RED} strokeOpacity=".55" strokeWidth="1.4" strokeDasharray="4 3" />
          <ChooseTounsiMark x={123} y={182.5} width={74} />
          <g clipPath="url(#adb-label-clip)">
            <rect className="adb-shine" x="92" y="168" width="18" height="92" fill="url(#adb-shine-grad)" />
          </g>
        </g>
        {BURSTS.map(({ x, y, bx, by, c }, i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path className="adb-burst" style={{ '--bx': `${bx}px`, '--by': `${by}px`, animationDelay: `${i * 0.06}s` } as React.CSSProperties}
              d="M0 -7 Q1 -1 7 0 Q1 1 0 7 Q-1 1 -7 0 Q-1 -1 0 -7Z" fill={c} stroke={INK} strokeWidth="1" />
          </g>
        ))}
        <path d="M100 262 L222 262" stroke={RED_DEEP} strokeOpacity=".35" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />

        {/* front handle + swinging price tag */}
        <path d="M122 152 C122 100 198 100 198 152" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <g transform="translate(190 118)">
          <g className="adb-tag">
            <path d="M0 0 L0 12" stroke={INK} strokeWidth="1.5" />
            <path d="M-9 12 H9 V32 L0 38 L-9 32Z" fill={GREEN} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="0" cy="17" r="2" fill="#fff" />
            <path d="M-4 26 H4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  )
}
