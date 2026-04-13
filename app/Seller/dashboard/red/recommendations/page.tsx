'use client';
import RestockAlerts       from '@/app/seller/components/red/recommendations/RestockAlerts';
import PricingOpportunities from '@/app/seller/components/red/recommendations/PricingOpportunities';
import CatalogRecs         from '@/app/seller/components/red/recommendations/CatalogRecs';

const ACTION_PLAN = [
  {
    priority: 1,
    title: 'Restock Jebba Homme Classique immediately',
    detail: 'You\'re losing ~3-4 sales/day. This product has 22 past buyers who may rebuy.',
    urgent: true,
  },
  {
    priority: 2,
    title: 'Raise Casque Bluetooth price to 29 DT',
    detail: 'AI analysis shows price elasticity supports a 3 DT increase without demand drop.',
    urgent: false,
  },
  {
    priority: 3,
    title: 'Launch Ramadan bundle: Harissa + Couscous + Savon',
    detail: 'Seasonal demand spike in 6 days. Projected +34% uplift on Food category.',
    urgent: false,
  },
];

export default function RecommendationsPage() {
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
          Recommendations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>AI-powered suggestions to grow your store</p>
      </div>

      {/* Action plan */}
      <div className="red-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
          🎯 Growth Action Plan — This Week
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACTION_PLAN.map(({ priority, title, detail, urgent }) => (
            <div
              key={priority}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 14,
                background: 'var(--surface3)',
                borderRadius: 10,
                border: `1px solid ${urgent ? 'rgba(231,76,60,0.2)' : 'var(--border)'}`,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: urgent ? 'var(--red)' : 'var(--red-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {priority}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  {title}
                  {urgent && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 9,
                        fontWeight: 700,
                        background: 'rgba(231,76,60,0.15)',
                        color: '#e74c3c',
                        padding: '1px 6px',
                        borderRadius: 20,
                      }}
                    >
                      URGENT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <RestockAlerts />
        <PricingOpportunities />
      </div>

      <CatalogRecs />
    </div>
  );
}