/**
 * Seller-door hero: a little Tunisian storefront. Striped awning sways, the
 * "Ma Boutique" sign swings, the "OUVERT" card flips in, and coins / hearts / stars
 * pop out of the door like sales happening. The door itself opens when the host
 * panel is hovered (rule lives in DualCTASection via `.ast-door`).
 * Only transform/opacity are animated.
 */

import { PepperShape } from './AnimatedPepper'

const INK = '#111'
const RED = '#db142e'
const GREEN = '#198f41'
const GREEN_DARK = '#0f6b30'
const GOLD = '#facc15'

/* Awning: 8 stripes between x=44 and x=276, scalloped bottom edge */
const AW_X = 44
const AW_W = 232
const AW_N = 8
const AW_TOP = 124
const AW_BASE = 150
const SW = AW_W / AW_N
const STRIPES = Array.from({ length: AW_N }, (_, i) => {
  const x = AW_X + i * SW
  const r = SW / 2
  return {
    d: `M${x} ${AW_TOP} H${x + SW} V${AW_BASE} A${r} ${r} 0 0 1 ${x} ${AW_BASE} Z`,
    fill: i % 2 === 0 ? RED : '#fff',
  }
})
const AW_OUTLINE = `M${AW_X} ${AW_TOP} H${AW_X + AW_W} V${AW_BASE} `
  + Array.from({ length: AW_N }, (_, i) => {
    const r = SW / 2
    return `A${r} ${r} 0 0 1 ${AW_X + AW_W - (i + 1) * SW} ${AW_BASE}`
  }).join(' ') + ' Z'

function Coin() {
  return (
    <g>
      <circle r="8" fill={GOLD} stroke={INK} strokeWidth="2" />
      <circle r="4.5" fill="none" stroke="#a16207" strokeWidth="1.5" />
    </g>
  )
}
function Heart() {
  return <path d="M0 7 C-9 1 -9 -6 -4.5 -6.5 C-2 -6.8 -0.5 -5 0 -3.5 C0.5 -5 2 -6.8 4.5 -6.5 C9 -6 9 1 0 7Z" fill={RED} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
}
function Star() {
  return <path d="M0 -8 L2.4 -2.6 L8 -2.2 L3.7 1.4 L5 7 L0 4 L-5 7 L-3.7 1.4 L-8 -2.2 L-2.4 -2.6Z" fill={GOLD} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
}

const POPS = [
  { dx: -44, delay: 0, sx: -40, sy: -70, Icon: Coin },
  { dx: 34, delay: -0.6, sx: 38, sy: -96, Icon: Heart },
  { dx: -12, delay: -1.2, sx: -8, sy: -118, Icon: Star },
  { dx: 52, delay: -1.8, sx: 0, sy: 0, Icon: Coin },
  { dx: 12, delay: -2.4, sx: 0, sy: 0, Icon: Heart },
]

interface AnimatedStoreProps {
  signLabel: string
  openLabel: string
  className?: string
}

export default function AnimatedStore({ signLabel, openLabel, className = '' }: AnimatedStoreProps) {
  return (
    <svg viewBox="0 0 320 320" className={`ast ${className}`} aria-hidden="true" focusable="false">
      <style>{`
        .ast-anim { transform-box: fill-box; transform-origin: center; }
        .ast-sign { transform-origin: 50% 0; animation: astSwing 3.8s ease-in-out infinite; }
        .ast-awning { transform-origin: 50% 0; animation: astSway 4.2s ease-in-out infinite; }
        .ast-open-swing { transform-origin: 50% 0; animation: astSwing 3s ease-in-out infinite; animation-delay: -1s; }
        .ast-open-flip { animation: astFlip 1s cubic-bezier(.3,1.6,.5,1) .6s both; }
        .ast-door { transform-origin: 0 50%; transition: transform .7s cubic-bezier(.4,1.3,.5,1); }
        .ast-pop { transform: translate(var(--sx), var(--sy)); animation: astPop 3s ease-out infinite both; }
        .ast-glint { animation: astGlint 5s ease-in-out infinite; }
        .ast-leaf { transform-origin: 50% 100%; animation: astLeaf 3.4s ease-in-out infinite; }
        .ast-spark { animation: astTwinkle 2.4s ease-in-out infinite both; }
        .ast-pop--hidden-static { opacity: 0; }
        .ast-peek { animation: astPeek 5s ease-in-out infinite; }
        @keyframes astPeek { 0%,100% { transform: translateY(4px) rotate(0deg) } 40%,60% { transform: translateY(-3px) rotate(-8deg) } }
        @keyframes astSwing { 0%,100% { transform: rotate(-2.5deg) } 50% { transform: rotate(2.5deg) } }
        @keyframes astSway { 0%,100% { transform: skewX(0deg) scaleY(1) } 50% { transform: skewX(-2deg) scaleY(1.05) } }
        @keyframes astFlip { 0% { transform: scaleX(0); opacity: 0 } 40% { opacity: 1 } 100% { transform: scaleX(1); opacity: 1 } }
        @keyframes astPop {
          0%   { opacity: 0; transform: translate(0, 6px) scale(.2); }
          18%  { opacity: 1; transform: translate(calc(var(--dx) * .3), -24px) scale(1.1); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), -120px) scale(.8); }
        }
        @keyframes astGlint { 0%,55% { transform: translateX(-90px); opacity: 0 } 60% { opacity: .9 } 80%,100% { transform: translateX(130px); opacity: 0 } }
        @keyframes astLeaf { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
        @keyframes astTwinkle { 0%,100% { opacity: .15; transform: scale(.5) } 50% { opacity: 1; transform: scale(1) } }
        .ast-sign-text { font-family: 'Barlow Condensed', var(--font-cairo, system-ui), sans-serif; font-weight: 900; }
        .ast-open-text { font-family: 'Barlow', var(--font-cairo, system-ui), sans-serif; font-weight: 800; }
      `}</style>

      <defs>
        <clipPath id="ast-window-clip"><rect x="66" y="176" width="108" height="82" rx="4" /></clipPath>
      </defs>

      <ellipse cx="160" cy="291" rx="132" ry="9" fill={INK} opacity=".08" />

      {/* sparkles */}
      {[[36, 70, 0, GOLD], [288, 96, -0.8, GREEN], [286, 40, -1.6, RED]].map(([x, y, d, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path className="ast-anim ast-spark" style={{ animationDelay: `${d}s` }} d="M0 -7 Q1 -1 7 0 Q1 1 0 7 Q-1 1 -7 0 Q-1 -1 0 -7Z" fill={c as string} />
        </g>
      ))}

      {/* sidewalk + building */}
      <rect x="26" y="278" width="268" height="10" rx="5" fill="#e5e7eb" stroke={INK} strokeWidth="2" />
      <rect x="52" y="118" width="216" height="162" rx="6" fill="#fffbeb" stroke={INK} strokeWidth="2.5" />
      {/* zellige skirting */}
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M${60 + i * 16} 271 l6 -6 6 6 -6 6z`} fill={i % 2 ? GREEN : '#1d4ed8'} opacity=".75" />
      ))}

      {/* sign frame + swinging sign */}
      <path d="M96 106 V46 M224 106 V46 M90 46 H230" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <g className="ast-anim ast-sign">
        <path d="M124 46 V60 M196 46 V60" stroke={INK} strokeWidth="2" strokeDasharray="3 2" />
        <rect x="102" y="58" width="116" height="38" rx="9" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <rect x="107" y="63" width="106" height="28" rx="6" fill="none" stroke={RED} strokeWidth="1.5" strokeDasharray="4 3" />
        <text className="ast-sign-text" x="160" y="84" textAnchor="middle" fontSize="19" fill={INK}>{signLabel}</text>
      </g>

      {/* cornice */}
      <rect x="44" y="106" width="232" height="18" rx="5" fill={GREEN} stroke={INK} strokeWidth="2.5" />
      <path d="M56 115 H264" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />

      {/* window with shelves */}
      <rect x="66" y="176" width="108" height="82" rx="4" fill="#e0f2fe" stroke={INK} strokeWidth="2.5" />
      <g clipPath="url(#ast-window-clip)">
        <rect x="66" y="206" width="108" height="4" fill="#92400e" />
        <rect x="66" y="240" width="108" height="4" fill="#92400e" />
        {/* top shelf: jars + vase */}
        <rect x="76" y="192" width="12" height="14" rx="3" fill={GOLD} stroke={INK} strokeWidth="1.5" />
        <rect x="92" y="188" width="12" height="18" rx="3" fill={RED} stroke={INK} strokeWidth="1.5" />
        <path d="M112 190 h8 q-1 3 1 5 q6 3 5 7 q-1 4 -10 4 q-9 0 -10 -4 q-1 -4 5 -7 q2 -2 1 -5z" fill="#d9622b" stroke={INK} strokeWidth="1.5" />
        {/* bottom shelf: folded fabrics + tote */}
        <rect x="76" y="232" width="26" height="8" rx="2" fill="#fff" stroke={INK} strokeWidth="1.5" />
        <rect x="78" y="224" width="22" height="8" rx="2" fill={RED} stroke={INK} strokeWidth="1.5" />
        <rect x="80" y="217" width="18" height="7" rx="2" fill={GREEN} stroke={INK} strokeWidth="1.5" />
        <path d="M110 224 h18 l2 16 h-22z" fill={GREEN} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M114 224 q5 -8 10 0" fill="none" stroke={INK} strokeWidth="1.5" />
        {/* a chili resting on the bottom shelf */}
        <g transform="translate(153 233) rotate(-72) scale(.62)"><PepperShape color="red" /></g>
        <path className="ast-glint" d="M66 258 L96 176 L112 176 L82 258Z" fill="#fff" opacity="0" />
      </g>

      {/* hanging OUVERT card */}
      <g className="ast-anim ast-open-swing">
        <path d="M148 176 L136 186 M148 176 L160 186" stroke={INK} strokeWidth="1.4" />
        <g className="ast-anim ast-open-flip">
          <rect x="126" y="185" width="44" height="17" rx="3.5" fill={GREEN} stroke={INK} strokeWidth="1.8" />
          <text className="ast-open-text" x="148" y="197" textAnchor="middle" fontSize="8.5" fill="#fff" letterSpacing=".5">{openLabel}</text>
        </g>
      </g>

      {/* doorway: warm interior, then the door panel */}
      <rect x="190" y="168" width="64" height="112" rx="4" fill={INK} />
      <rect x="194" y="172" width="56" height="106" rx="2" fill="#fde68a" />
      <rect x="200" y="196" width="44" height="3" fill="#f59e0b" opacity=".6" />
      <rect x="200" y="222" width="44" height="3" fill="#f59e0b" opacity=".6" />
      <g className="ast-anim ast-door">
        <rect x="194" y="172" width="56" height="106" rx="2" fill={GREEN} stroke={INK} strokeWidth="2" />
        <path d="M202 206 V190 a20 20 0 0 1 40 0 V206Z" fill="#bbf7d0" stroke={INK} strokeWidth="1.8" />
        <rect x="202" y="216" width="40" height="52" rx="3" fill="none" stroke={GREEN_DARK} strokeWidth="2" />
        <circle cx="240" cy="232" r="3.5" fill={GOLD} stroke={INK} strokeWidth="1.5" />
      </g>
      <rect x="196" y="279" width="52" height="5" rx="2" fill={RED} />

      {/* sales popping out of the door */}
      <g transform="translate(222 232)">
        {POPS.map(({ dx, delay, sx, sy, Icon }, i) => (
          <g key={i} className={`ast-anim ast-pop${sx === 0 && sy === 0 ? ' ast-pop--hidden-static' : ''}`}
            style={{ '--dx': `${dx}px`, '--sx': `${sx}px`, '--sy': `${sy}px`, animationDelay: `${delay}s` } as React.CSSProperties}>
            <Icon />
          </g>
        ))}
      </g>

      {/* green chili peeking from behind the awning */}
      <g transform="translate(246 104) rotate(22) scale(1.15)">
        <g className="ast-anim ast-peek"><PepperShape color="green" /></g>
      </g>

      {/* awning (drawn over the building top so its sway reads) */}
      <g className="ast-anim ast-awning">
        {STRIPES.map((s, i) => <path key={i} d={s.d} fill={s.fill} />)}
        <path d={AW_OUTLINE} fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </g>

      {/* potted plant */}
      <g className="ast-anim ast-leaf">
        <path d="M34 256 Q24 236 30 220 Q38 238 36 256Z" fill={GREEN} stroke={INK} strokeWidth="1.8" />
        <path d="M38 256 Q44 232 58 224 Q52 244 42 257Z" fill="#22c55e" stroke={INK} strokeWidth="1.8" />
        <path d="M36 256 Q36 232 40 214 Q46 236 40 256Z" fill={GREEN_DARK} stroke={INK} strokeWidth="1.8" />
      </g>
      <path d="M24 256 H54 L50 280 H28Z" fill="#d9622b" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 263 H52" stroke="#fff7ed" strokeWidth="2" />
    </svg>
  )
}
