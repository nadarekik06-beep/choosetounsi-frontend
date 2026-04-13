'use client';

const RECS = [
  { name: 'Écouteurs sans fil intra',    reason: 'High demand in Electronics. 34 sellers listed this week.', score: 87 },
  { name: 'Huile d\'argan 100ml',        reason: 'Trending in Tunisian beauty. Complements your food catalog.', score: 81 },
  { name: 'Pochette transport universelle', reason: 'Perfect bundle with Casque XL3. +23% basket size.',       score: 79 },
  { name: 'Savon d\'Alep Authentique',   reason: 'Artisan niche with low competition. Matches your brand.',    score: 74 },
  { name: 'Chargeur sans fil 15W',       reason: 'Accessory complement to Casque XL3. Bundle potential: high.', score: 72 },
  { name: 'Couscous Artisanal 1kg',      reason: 'Pre-Ramadan demand spike predicted. Food category trending.', score: 69 },
];

export default function CatalogRecs() {
  return (
    <div className="red-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Add to Your Catalog</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>AI-recommended products to list</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {RECS.map(({ name, reason, score }) => (
          <div
            key={name}
            style={{
              background: 'var(--surface3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              transition: 'border-color 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-red)')}
            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>{reason}</div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--red-light)', fontVariantNumeric: 'tabular-nums' }}>
                {score}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 5 }}>match score</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}