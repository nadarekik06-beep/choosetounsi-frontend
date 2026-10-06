'use client'

/**
 * Light page-header decoration shared by /shop and /deals: an animated icon tile
 * next to the title, and a few line icons drifting softly in the header's empty
 * space (desktop only). CSS transform/opacity loops; still under reduced motion.
 */

import type { CSSProperties } from 'react'
import {
  ShoppingBag, Tag, Sparkles, Zap, Shirt, Monitor, Coffee, Home, Gift, Percent, Ticket, Package, Heart, Star,
  type LucideIcon,
} from 'lucide-react'

type Kind = 'shop' | 'deals'

const TILE: Record<Kind, { Icon: LucideIcon; Spark: LucideIcon }> = {
  shop:  { Icon: ShoppingBag, Spark: Sparkles },
  deals: { Icon: Tag,         Spark: Zap },
}

// Fixed positions (no hydration drift); x/y in % of the decor area
const FLOAT: Record<Kind, { Icon: LucideIcon; x: number; y: number; s: number; d: number; tone: 'red' | 'green' | 'ink' }[]> = {
  shop: [
    { Icon: Shirt,   x: 4,  y: 52, s: 18, d: 0,   tone: 'red' },
    { Icon: Monitor, x: 22, y: 14, s: 16, d: 1.4, tone: 'ink' },
    { Icon: Coffee,  x: 40, y: 58, s: 17, d: 2.6, tone: 'green' },
    { Icon: Home,    x: 58, y: 10, s: 16, d: 0.8, tone: 'red' },
    { Icon: Heart,   x: 76, y: 50, s: 15, d: 2,   tone: 'ink' },
    { Icon: Star,    x: 93, y: 16, s: 14, d: 3.2, tone: 'green' },
  ],
  deals: [
    { Icon: Percent, x: 6,  y: 48, s: 18, d: 0,   tone: 'red' },
    { Icon: Zap,     x: 26, y: 12, s: 16, d: 1.2, tone: 'ink' },
    { Icon: Ticket,  x: 46, y: 56, s: 17, d: 2.4, tone: 'green' },
    { Icon: Gift,    x: 66, y: 12, s: 16, d: 0.6, tone: 'red' },
    { Icon: Package, x: 88, y: 50, s: 16, d: 1.8, tone: 'ink' },
  ],
}

/** Icon tile beside the page title: the icon bobs (shop) or swings like a hanging tag (deals). */
export function HeaderBadge({ kind }: { kind: Kind }) {
  const { Icon, Spark } = TILE[kind]
  return (
    <span className={`ph-badge ph-badge--${kind}`} aria-hidden="true">
      <Icon className="ph-badge__icon" size={22} strokeWidth={1.9} />
      <Spark className="ph-badge__spark" size={11} strokeWidth={2.2} />
    </span>
  )
}

/** Faint drifting icons for the header's empty middle (hidden on small screens). */
export function FloatingIcons({ kind }: { kind: Kind }) {
  return (
    <span className="ph-float" aria-hidden="true">
      {FLOAT[kind].map(({ Icon, x, y, s, d, tone }, i) => (
        <span key={i} className={`ph-float__i ph-float__i--${tone}`}
          style={{ insetInlineStart: `${x}%`, top: `${y}%`, '--d': `${d}s` } as CSSProperties}>
          <Icon size={s} strokeWidth={1.7} />
        </span>
      ))}
    </span>
  )
}
