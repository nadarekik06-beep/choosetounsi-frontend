'use client';
import PriceOptimizer       from '@/app/seller/components/red/ai/PriceOptimizer';
import DescriptionGenerator from '@/app/seller/components/red/ai/DescriptionGenerator';
import SalesPredictor       from '@/app/seller/components/red/ai/SalesPredictor';
import BundleAdvisor        from '@/app/seller/components/red/ai/BundleAdvisor';

export default function AIToolsPage() {
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
          AI Tools
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Powered by Anthropic Claude — exclusive to Red Pepper subscribers
        </p>
      </div>

      {/* Info banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--red-subtle)',
          border: '1px solid var(--border-red)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 24,
          fontSize: 13,
          color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: 18 }}>🤖</span>
        <span>
          All AI tools use your store&apos;s real context. Results are tailored for{' '}
          <strong style={{ color: 'var(--red-light)' }}>Tunisian market conditions</strong>.
          If the AI call fails, a smart fallback activates automatically.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <PriceOptimizer />
        <DescriptionGenerator />
        <SalesPredictor />
        <BundleAdvisor />
      </div>
    </div>
  );
}