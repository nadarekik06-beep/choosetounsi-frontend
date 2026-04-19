'use client';
/**
 * app/seller/promote/analytics/page.tsx
 *
 * Sponsorship analytics dashboard — shows per-sponsorship stats:
 * impressions, clicks, conversions, CTR, and conversion rate.
 */

import { useState, useEffect } from 'react';
import { Eye, MousePointer, ShoppingBag, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../layout';
import { sponsorshipApi, SponsorshipRecord } from '@/lib/sponsorshipApi';

export default function SponsorshipAnalyticsPage() {
  const { dark } = useTheme();

  const [records,  setRecords]  = useState<SponsorshipRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'active' | 'expired' | 'all'>('all');

  const bg       = dark ? '#0D1117' : '#f4f5f7';
  const card     = dark ? '#161b27' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : '#e8eaed';
  const textMain = dark ? '#f0f0f0' : '#111';
  const textMuted= dark ? 'rgba(255,255,255,0.45)' : '#888';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await sponsorshipApi.list({ per_page: 100 });
        setRecords(res.data.data ?? []);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = tab === 'all'
    ? records
    : records.filter(r => r.status === tab);

  // Totals
  const totalImpressions = records.reduce((s, r) => s + r.impressions, 0);
  const totalClicks      = records.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = records.reduce((s, r) => s + r.conversions, 0);
  const avgCTR           = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(1)
    : '0';

  const statCards = [
    { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: <Eye size={16} color="#6366f1" />, bg: '#ede9fe', color: '#6366f1' },
    { label: 'Total Clicks',      value: totalClicks.toLocaleString(),      icon: <MousePointer size={16} color="#3b82f6" />, bg: '#dbeafe', color: '#3b82f6' },
    { label: 'Conversions',       value: totalConversions.toLocaleString(), icon: <ShoppingBag size={16} color="#16a34a" />, bg: '#dcfce7', color: '#16a34a' },
    { label: 'Avg CTR',           value: `${avgCTR}%`,                      icon: <TrendingUp size={16} color="#f59e0b" />, bg: '#fef9c3', color: '#f59e0b' },
  ];

  const STATUS_COLORS: Record<string, string> = {
    active:    '#16a34a',
    expired:   '#94a3b8',
    cancelled: '#ef4444',
  };

  const PLAN_COLORS: Record<string, string> = {
    free:  '#198f41',
    red:   '#db142e',
    black: '#f59e0b',
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 24px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <Link href="/seller/promote" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: textMuted, textDecoration: 'none', fontSize: 13, fontWeight: 700,
        }}>
          <ArrowLeft size={15} /> Back
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: 0 }}>
          Sponsorship Analytics
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.06)' : s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['all', 'active', 'expired'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 8,
            border: `1.5px solid ${tab === t ? '#db142e' : border}`,
            background: tab === t ? (dark ? 'rgba(219,20,46,0.14)' : 'rgba(219,20,46,0.06)') : 'transparent',
            color: tab === t ? '#db142e' : textMuted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: textMuted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: textMuted }}>
            No sponsorships found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Product', 'Plan', 'Status', 'Boost', 'Period', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'Cost'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(1) : '0';
                  const cvr = s.clicks > 0 ? ((s.conversions / s.clicks) * 100).toFixed(1) : '0';
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)') }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: textMain, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.product?.name ?? `#${s.product_id}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                          color: PLAN_COLORS[s.plan_type] ?? '#888',
                          background: dark ? 'rgba(255,255,255,0.06)' : '#f5f5f5',
                          textTransform: 'capitalize',
                        }}>{s.plan_type}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                          color: STATUS_COLORS[s.status] ?? '#888',
                          background: dark ? 'rgba(255,255,255,0.06)' : '#f5f5f5',
                          textTransform: 'capitalize',
                        }}>{s.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#db142e' }}>+{s.boost_score}</td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: textMuted, whiteSpace: 'nowrap' }}>
                        {s.start_at ? new Date(s.start_at).toLocaleDateString('en-GB') : '—'}
                        {s.end_at ? ` → ${new Date(s.end_at).toLocaleDateString('en-GB')}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{s.impressions.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{s.clicks.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{ctr}%</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{s.conversions}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: Number(s.amount_charged) === 0 ? '#16a34a' : textMain }}>
                        {Number(s.amount_charged) === 0 ? 'FREE' : `${Number(s.amount_charged).toFixed(3)} DT`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}