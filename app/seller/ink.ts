// Accent colours in the seller dashboard are tuned for dark surfaces; used as
// text on white they drop to ~2:1 contrast. ink() keeps the accent in dark mode
// and swaps in a deeper shade of the same hue (≥ 4.5:1 on white) in light mode.
// Brand red/green (#db142e / #198f41) are intentionally not remapped.

const LIGHT_INK: Record<string, string> = {
  '#f59e0b': '#92400e', '#fbbf24': '#92400e', '#eab308': '#92400e', '#d97706': '#92400e',
  '#10b981': '#065f46', '#34d399': '#065f46', '#6ee7b7': '#065f46', '#059669': '#065f46',
  '#22c55e': '#166534', '#4ade80': '#166534', '#16a34a': '#166534',
  '#f87171': '#991b1b', '#fca5a5': '#991b1b', '#ef4444': '#991b1b',
  '#3b82f6': '#1d4ed8', '#60a5fa': '#1d4ed8', '#93c5fd': '#1d4ed8',
  '#6366f1': '#4338ca', '#818cf8': '#4338ca',
  '#8b5cf6': '#6d28d9', '#a78bfa': '#6d28d9', '#c4b5fd': '#6d28d9',
  '#a855f7': '#7e22ce', '#d8b4fe': '#7e22ce',
  '#06b6d4': '#0e7490', '#22d3ee': '#0e7490',
  '#14b8a6': '#0f766e',
  '#f97316': '#c2410c', '#fb923c': '#c2410c',
  '#ec4899': '#be185d',
  '#94a3b8': '#5b6472', '#9ca3af': '#5b6472',
};

/** Text colour for `color` that stays readable on the current theme's surfaces. */
export function ink(color: string, dark: boolean): string {
  return dark ? color : (LIGHT_INK[color.toLowerCase()] ?? color);
}

/** Light-surface shade of an accent (for components that are always light, e.g. modals). */
export function lightInk(color: string): string {
  return LIGHT_INK[color.toLowerCase()] ?? color;
}
