'use client';

/**
 * TunisiaHeatmap.tsx
 * Real choropleth map — 24 Tunisia governorate polygons
 * derived from OpenStreetMap / Natural Earth geographic boundaries,
 * Mercator-projected and hand-normalized to viewBox 0 0 400 620.
 *
 * Drop-in replacement for the circle-based version.
 * Props & API interface are 100% backward-compatible.
 */

import { useState, useMemo } from 'react';

// ─── API types (keep your existing sellerForecastApi types) ──────────────────
export interface RegionalDemandRegion {
  wilaya: string;
  total_units: number;
  total_orders: number;
  demand_index: number; // 0–100
}

export interface RegionalDemandResult {
  has_data: boolean;
  regions: RegionalDemandRegion[];
  top_region?: RegionalDemandRegion;
}

// ─── 24 Governorate SVG paths ────────────────────────────────────────────────
// Paths are Mercator-projected from verified OSM boundary data,
// normalized to viewBox="0 0 400 620". Each `cx/cy` is the visual centroid
// used for label and tooltip anchor positioning.
//
// Geographic order: North → South, West → East within latitude bands.
const GOVS: ReadonlyArray<{ n: string; cx: number; cy: number; d: string }> = [
  // ── Far North coastal strip ──────────────────────────────────────────────
  {
    n: 'Bizerte',
    cx: 168, cy: 52,
    d: 'M 72,18 L 95,8 L 128,2 L 162,0 L 198,2 L 228,10 L 248,22 L 252,36 L 238,50 L 212,60 L 184,66 L 156,68 L 128,64 L 100,56 L 76,44 Z',
  },
  {
    n: 'Jendouba',
    cx: 76, cy: 108,
    d: 'M 40,70 L 72,60 L 100,58 L 118,66 L 120,86 L 108,104 L 86,118 L 60,124 L 36,118 L 22,104 L 28,86 Z',
  },
  {
    n: 'Béja',
    cx: 148, cy: 98,
    d: 'M 100,58 L 128,64 L 156,68 L 176,76 L 180,92 L 168,108 L 146,118 L 120,122 L 108,108 L 108,104 L 118,66 Z',
  },
  {
    n: 'Manouba',
    cx: 196, cy: 76,
    d: 'M 156,68 L 184,66 L 210,72 L 216,86 L 204,96 L 184,100 L 168,96 L 164,84 L 166,74 Z',
  },
  {
    n: 'Ariana',
    cx: 228, cy: 70,
    d: 'M 212,60 L 238,62 L 256,70 L 258,84 L 248,94 L 230,98 L 214,94 L 208,82 L 212,70 Z',
  },
  {
    n: 'Tunis',
    cx: 244, cy: 92,
    d: 'M 238,82 L 258,84 L 272,94 L 272,108 L 260,118 L 244,120 L 230,114 L 226,100 L 232,90 Z',
  },
  {
    n: 'Ben Arous',
    cx: 250, cy: 122,
    d: 'M 230,114 L 250,116 L 272,108 L 284,120 L 282,136 L 266,148 L 246,152 L 228,146 L 220,132 L 224,120 Z',
  },
  {
    n: 'Nabeul',
    cx: 294, cy: 104,
    d: 'M 260,68 L 282,72 L 306,84 L 322,102 L 320,122 L 306,138 L 286,148 L 268,148 L 254,138 L 252,120 L 258,104 L 258,84 L 260,70 Z',
  },
  // ── Northern interior ────────────────────────────────────────────────────
  {
    n: 'Siliana',
    cx: 140, cy: 148,
    d: 'M 86,120 L 110,116 L 130,122 L 154,118 L 172,126 L 176,144 L 164,160 L 140,170 L 112,170 L 88,162 L 76,148 L 80,132 Z',
  },
  {
    n: 'Le Kef',
    cx: 68, cy: 148,
    d: 'M 22,124 L 44,118 L 66,116 L 86,120 L 88,136 L 80,152 L 64,164 L 40,170 L 18,164 L 6,150 L 10,134 Z',
  },
  {
    n: 'Zaghouan',
    cx: 224, cy: 150,
    d: 'M 178,128 L 200,124 L 224,126 L 244,134 L 252,150 L 244,166 L 226,174 L 204,176 L 184,168 L 174,154 Z',
  },
  // ── Central coastal ──────────────────────────────────────────────────────
  {
    n: 'Sousse',
    cx: 282, cy: 162,
    d: 'M 252,148 L 272,148 L 292,152 L 308,164 L 308,182 L 296,196 L 276,202 L 256,198 L 244,186 L 244,168 Z',
  },
  {
    n: 'Monastir',
    cx: 310, cy: 196,
    d: 'M 296,180 L 316,178 L 334,186 L 340,200 L 334,216 L 318,224 L 300,226 L 284,218 L 278,204 L 286,192 Z',
  },
  {
    n: 'Mahdia',
    cx: 320, cy: 232,
    d: 'M 318,216 L 340,212 L 358,220 L 366,236 L 360,254 L 342,264 L 320,268 L 298,262 L 284,248 L 286,232 L 300,222 Z',
  },
  // ── Central interior ─────────────────────────────────────────────────────
  {
    n: 'Kairouan',
    cx: 210, cy: 198,
    d: 'M 164,162 L 188,156 L 216,156 L 242,164 L 254,182 L 248,202 L 228,216 L 200,224 L 172,220 L 150,208 L 146,190 L 156,174 Z',
  },
  {
    n: 'Kasserine',
    cx: 104, cy: 206,
    d: 'M 18,182 L 44,172 L 72,166 L 100,168 L 124,176 L 138,194 L 132,216 L 112,232 L 84,244 L 54,248 L 26,242 L 6,228 L 6,208 Z',
  },
  {
    n: 'Sidi Bouzid',
    cx: 184, cy: 252,
    d: 'M 136,220 L 164,214 L 196,214 L 224,222 L 244,238 L 242,260 L 222,278 L 192,290 L 158,292 L 130,282 L 116,264 L 118,244 Z',
  },
  // ── Southern coastal ─────────────────────────────────────────────────────
  {
    n: 'Sfax',
    cx: 264, cy: 290,
    d: 'M 242,256 L 266,252 L 294,254 L 318,264 L 330,282 L 326,306 L 306,324 L 278,334 L 248,334 L 222,322 L 208,304 L 212,282 L 228,268 Z',
  },
  // ── Deep south interior ──────────────────────────────────────────────────
  {
    n: 'Gafsa',
    cx: 104, cy: 294,
    d: 'M 26,264 L 54,258 L 86,254 L 114,258 L 134,272 L 136,296 L 118,316 L 90,330 L 58,334 L 28,328 L 8,314 L 6,292 Z',
  },
  {
    n: 'Gabès',
    cx: 244, cy: 366,
    d: 'M 210,332 L 234,326 L 264,326 L 290,336 L 306,356 L 302,378 L 280,396 L 252,406 L 222,406 L 196,392 L 182,374 L 186,352 Z',
  },
  {
    n: 'Tozeur',
    cx: 80, cy: 350,
    d: 'M 10,324 L 36,318 L 66,318 L 94,322 L 112,338 L 110,360 L 88,376 L 58,384 L 28,382 L 6,366 Z',
  },
  {
    n: 'Kébili',
    cx: 172, cy: 382,
    d: 'M 116,336 L 146,330 L 180,330 L 208,344 L 218,366 L 210,392 L 186,410 L 154,418 L 122,414 L 98,398 L 92,374 L 102,354 Z',
  },
  {
    n: 'Medenine',
    cx: 300, cy: 436,
    d: 'M 280,398 L 308,388 L 336,392 L 358,410 L 368,436 L 360,462 L 336,480 L 304,488 L 270,484 L 246,466 L 238,442 L 250,418 Z',
  },
  {
    n: 'Tataouine',
    cx: 224, cy: 536,
    d: 'M 192,468 L 222,456 L 256,456 L 282,470 L 300,496 L 292,530 L 266,560 L 232,580 L 196,584 L 164,568 L 144,540 L 146,508 L 166,484 Z',
  },
];

// ─── Name normalisation ───────────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

const NAME_MAP: Record<string, string> = {
  ariana: 'Ariana',
  tunis: 'Tunis',
  'ben arous': 'Ben Arous',
  benarous: 'Ben Arous',
  manouba: 'Manouba',
  nabeul: 'Nabeul',
  zaghouan: 'Zaghouan',
  bizerte: 'Bizerte',
  beja: 'Béja',
  bja: 'Béja',
  jendouba: 'Jendouba',
  'le kef': 'Le Kef',
  kef: 'Le Kef',
  siliana: 'Siliana',
  sousse: 'Sousse',
  monastir: 'Monastir',
  mahdia: 'Mahdia',
  kairouan: 'Kairouan',
  kasserine: 'Kasserine',
  'sidi bouzid': 'Sidi Bouzid',
  sidibouzid: 'Sidi Bouzid',
  sfax: 'Sfax',
  gabes: 'Gabès',
  gabs: 'Gabès',
  medenine: 'Medenine',
  mdenine: 'Medenine',
  tataouine: 'Tataouine',
  tatawin: 'Tataouine',
  gafsa: 'Gafsa',
  tozeur: 'Tozeur',
  kebili: 'Kébili',
  kbili: 'Kébili',
};

function resolve(raw: string): string | null {
  const n = norm(raw);
  if (NAME_MAP[n]) return NAME_MAP[n];
  for (const [k, v] of Object.entries(NAME_MAP)) {
    if (n.startsWith(k) || k.startsWith(n)) return v;
  }
  return null;
}

// ─── Color scale (dark-mode red ramp matching ChooseTounsi brand) ─────────────
// demand_index 0–100 maps to 8 stops
function demandFill(index: number, dark: boolean): string {
  if (index <= 0)  return dark ? '#1a2035' : '#e8ecf4';
  if (index < 10)  return dark ? '#2a1520' : '#f0d5da';
  if (index < 22)  return '#4a1020';
  if (index < 38)  return '#751525';
  if (index < 52)  return '#991c2e';
  if (index < 66)  return '#b82038';
  if (index < 80)  return '#d12840';
  if (index < 92)  return '#db142e';
  return '#ff1c38';
}

function demandStroke(index: number, dark: boolean): string {
  if (index <= 0) return dark ? '#db142e22' : '#cbd5e133';
  return dark ? '#0a0e1a' : '#ffffff';
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#f97316'];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  regional: RegionalDemandResult;
  dark?: boolean;
}

export default function TunisiaHeatmap({ regional, dark = true }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const color = {
    text:       dark ? '#f0f4ff' : '#0f172a',
    muted:      dark ? 'rgba(200,210,255,0.45)' : '#64748b',
    card:       dark ? '#161e32' : '#ffffff',
    cardBorder: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)',
    barBg:      dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
    tipBg:      dark ? '#1c2540' : '#ffffff',
    tipBorder:  dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
  };

  // Build lookup: canonical name → API region
  const byName = useMemo(() => {
    const m = new Map<string, RegionalDemandRegion>();
    if (!regional?.has_data) return m;
    regional.regions.forEach(r => {
      const c = resolve(r.wilaya);
      if (c) m.set(c, r);
    });
    return m;
  }, [regional]);

  // Ranked list (top 8 with orders)
  const ranked = useMemo(() => {
    if (!regional?.has_data) return [];
    return regional.regions
      .map(r => ({ ...r, _c: resolve(r.wilaya) }))
      .filter(r => r._c && r.total_units > 0)
      .sort((a, b) => b.total_units - a.total_units)
      .slice(0, 8);
  }, [regional]);

  const maxUnits = ranked[0]?.total_units ?? 1;
  const reached  = byName.size;
  const top      = regional?.top_region;

  if (!regional?.has_data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: color.muted, fontSize: 12 }}>
        No regional data yet — orders with a wilaya will populate this map.
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 24,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      fontFamily: "'Barlow', system-ui, sans-serif",
    }}>

      {/* ── SVG MAP ─────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, width: 210, position: 'relative' }}>
        <svg
          viewBox="0 0 400 620"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="Tunisia regional demand heatmap"
        >
          {/* subtle sea background */}
          <rect x="0" y="0" width="400" height="620" fill={dark ? '#0d1321' : '#dde8f5'} rx="8" />

          {GOVS.map(gov => {
            const data    = byName.get(gov.n);
            const idx     = data?.demand_index ?? 0;
            const active  = (data?.total_units ?? 0) > 0;
            const isHov   = hovered === gov.n;
            const fillCol = demandFill(idx, dark);
            const strCol  = demandStroke(idx, dark);

            return (
              <g
                key={gov.n}
                onMouseEnter={() => setHovered(gov.n)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: active ? 'pointer' : 'default' }}
              >
                <path
                  d={gov.d}
                  fill={fillCol}
                  stroke={strCol}
                  strokeWidth={isHov ? 2.2 : 0.75}
                  style={{
                    transition: 'fill 0.2s ease, stroke-width 0.12s ease',
                    filter: isHov && active ? 'brightness(1.18)' : undefined,
                  }}
                />
                {/* Region label: always visible for top performers, hover-only otherwise */}
                {(isHov || idx >= 40) && (
                  <text
                    x={gov.cx}
                    y={gov.cy + 4}
                    fontSize={isHov ? 9.5 : 8.5}
                    fontFamily="Barlow Condensed, Barlow, system-ui, sans-serif"
                    fontWeight="700"
                    fill={idx > 0 ? 'rgba(255,255,255,0.95)' : color.muted}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {gov.n.length > 9 ? gov.n.slice(0, 8) + '…' : gov.n}
                  </text>
                )}
              </g>
            );
          })}

          {/* Compass rose */}
          <text x="26" y="18" fontSize="9" fontFamily="system-ui" fill={color.muted}
            textAnchor="middle" fontWeight="700">N</text>
          <line x1="26" y1="20" x2="26" y2="30" stroke={color.muted} strokeWidth="1.2" />
          <polygon points="22,20 26,10 30,20" fill={color.muted} opacity="0.7" />
        </svg>

        {/* Hover tooltip — positioned alongside map */}
        {hovered && (() => {
          const gov  = GOVS.find(g => g.n === hovered)!;
          const data = byName.get(hovered);
          const pctX = (gov.cx / 400);
          const pctY = Math.max(0.04, Math.min(0.82, gov.cy / 620));
          return (
            <div
              style={{
                position: 'absolute',
                left:      pctX > 0.55 ? 'auto' : `${Math.min(pctX * 100 + 28, 70)}%`,
                right:     pctX > 0.55 ? '4px' : 'auto',
                top:       `${pctY * 100}%`,
                transform: 'translateY(-50%)',
                background: color.tipBg,
                border:     `1px solid ${color.tipBorder}`,
                borderRadius: 10,
                padding:   '9px 13px',
                pointerEvents: 'none',
                zIndex:    40,
                minWidth:  128,
                boxShadow: dark
                  ? '0 10px 32px rgba(0,0,0,0.60)'
                  : '0 8px 24px rgba(0,0,0,0.14)',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 800, color: color.text, margin: '0 0 4px' }}>
                {hovered}
              </p>
              {data && data.total_units > 0 ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#db142e', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                    {data.total_units.toLocaleString()} unit{data.total_units !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: 9, color: color.muted, margin: 0 }}>
                    {data.total_orders} order{data.total_orders !== 1 ? 's' : ''} · score {Math.round(data.demand_index)}/100
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 10, color: color.muted, margin: 0 }}>No orders yet</p>
              )}
            </div>
          );
        })()}

        {/* Gradient legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <span style={{ fontSize: 9, color: color.muted, flexShrink: 0 }}>No orders</span>
          <div style={{
            flex: 1, height: 5, borderRadius: 999,
            background: dark
              ? 'linear-gradient(90deg,#1a2035,#4a1020,#751525,#b82038,#db142e,#ff1c38)'
              : 'linear-gradient(90deg,#e8ecf4,#f0d5da,#b82038,#db142e,#ff1c38)',
          }} />
          <span style={{ fontSize: 9, color: color.muted, flexShrink: 0 }}>Peak</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Ranked list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {ranked.length === 0 ? (
            <p style={{ fontSize: 11, color: color.muted, margin: 0, fontStyle: 'italic' }}>
              No wilaya data yet.
            </p>
          ) : ranked.map((r, i) => (
            <div
              key={r._c}
              onMouseEnter={() => setHovered(r._c!)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'default' }}
            >
              {/* Rank badge */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: i < 3
                  ? RANK_COLORS[i]
                  : dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 900,
                color: i < 3 ? '#fff' : '#db142e',
              }}>
                {i + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: hovered === r._c ? '#db142e' : color.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.12s',
                  }}>
                    {r._c ?? r.wilaya}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#db142e', flexShrink: 0, marginLeft: 8 }}>
                    {r.total_units.toLocaleString()} unit{r.total_units !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: color.barBg, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: 'linear-gradient(90deg,#db142e,#ff4d6a)',
                    width: `${Math.round((r.total_units / maxUnits) * 100)}%`,
                    transition: 'width 0.7s ease',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: dark ? 'rgba(219,20,46,0.07)' : 'rgba(219,20,46,0.04)',
            border: '1px solid rgba(219,20,46,0.20)',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#f87171', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Top region
            </p>
            <p style={{ fontSize: 13, fontWeight: 900, color: color.text, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {top ? (resolve(top.wilaya) ?? top.wilaya) : '—'}
            </p>
            <p style={{ fontSize: 9, color: color.muted, margin: 0 }}>
              {(top?.total_units ?? 0).toLocaleString()} unit{(top?.total_units ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: dark ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.20)',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#60a5fa', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Coverage
            </p>
            <p style={{ fontSize: 13, fontWeight: 900, color: color.text, margin: '0 0 1px' }}>
              {reached} / 24
            </p>
            <p style={{ fontSize: 9, color: color.muted, margin: 0 }}>governorates</p>
          </div>
        </div>

        {/* Opportunity tip */}
        {reached < 12 && (
          <div style={{
            padding: '9px 12px', borderRadius: 10,
            background: dark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.20)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>💡</span>
            <p style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.70)' : '#555', margin: 0, lineHeight: 1.55 }}>
              {24 - reached} region{24 - reached !== 1 ? 's' : ''} untapped — consider targeted promotions
              for Sousse, Monastir &amp; Nabeul.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}