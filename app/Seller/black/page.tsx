'use client';

/**
 * app/seller/black/page.tsx  — REDESIGNED
 *
 * Black Elite Command Center:
 *   • Welcome strip with Today's Brief inline
 *   • 4 metric cards (Revenue, Orders, Trending, AI Usage)
 *   • Quick Actions row
 *   • 6 feature gateway cards, each linking to its own dedicated page
 *
 * No accordions. No wall of information. One page — one clear entry point.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Crown, Brain, Eye, Star, TrendingUp, DollarSign,
  Zap, Users, Package, ShoppingBag, RefreshCw,
  ArrowRight, Sparkles, AlertTriangle,
} from 'lucide-react';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../layout';
import { blackPepperApi, type DailyBriefData } from '@/lib/blackPepperApi';
import { dashboardApi } from '@/lib/sellerApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickStat {
  label: string;
  value: string;
  color: string;
  icon: React.ElementType;
}

interface FeatureCard {
  href:     string;
  title:    string;
  subtitle: string;
  icon:     React.ElementType;
  accent:   string;
  badge?:   { text: string; color: string };
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, accent, dark }: {
  label: string; value: string; icon: React.ElementType; accent: string; dark: boolean;
}) {
  const bg      = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const txtMain = dark ? '#fff' : '#111';
  const txtSub  = dark ? 'rgba(255,255,255,0.4)' : '#888';

  return (
    <div style={{
      background: bg, borderRadius: 16, border: `1px solid ${border}`,
      padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      className="elite-metric-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
        }}>
          <Icon size={16} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 900, color: txtMain, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </p>
      <div style={{ height: 2, background: `${accent}25`, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '60%', background: accent, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ─── Feature gateway card ─────────────────────────────────────────────────────

function FeatureGatewayCard({ href, title, subtitle, icon: Icon, accent, badge, dark }: FeatureCard & { dark: boolean }) {
  const bg     = dark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const txtM   = dark ? '#fff' : '#111';
  const txtS   = dark ? 'rgba(255,255,255,0.45)' : '#888';

  return (
    <Link href={href} className="elite-feature-card" style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      background: bg, borderRadius: 18, border: `1px solid ${border}`,
      padding: '20px 20px 16px', textDecoration: 'none',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.22s ease',
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: -24, right: -24, width: 80, height: 80,
        borderRadius: '50%', background: accent, opacity: dark ? 0.1 : 0.07,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
            background: `${badge.color}18`, color: badge.color,
            border: `1px solid ${badge.color}35`, textTransform: 'uppercase' as const,
            letterSpacing: '0.06em', flexShrink: 0,
          }}>{badge.text}</span>
        )}
      </div>

      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: txtM, margin: '0 0 4px' }}>{title}</p>
        <p style={{ fontSize: 11.5, color: txtS, margin: 0, lineHeight: 1.55 }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>Open</span>
        <ArrowRight size={11} style={{ color: accent }} />
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,${accent},transparent)`, opacity: 0.5,
      }} />
    </Link>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon, accent, dark }: {
  href: string; label: string; icon: React.ElementType; accent: string; dark: boolean;
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
      background: `${accent}15`, border: `1px solid ${accent}30`,
      color: accent, fontSize: 12, fontWeight: 700,
      transition: 'all 0.15s ease', flexShrink: 0,
    }}
      className="elite-quick-action"
    >
      <Icon size={13} />
      {label}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlackOverviewPage() {
  const { dark }             = useTheme();
  const { isBlack, loading } = useSubscription();
  const router               = useRouter();

  const [brief,      setBrief]      = useState<DailyBriefData | null>(null);
  const [dashStats,  setDashStats]  = useState<any>(null);
  const [briefLoad,  setBriefLoad]  = useState(true);

  useEffect(() => {
    if (!loading && !isBlack) router.replace('/seller/subscription');
  }, [isBlack, loading, router]);

  const loadBrief = useCallback(async () => {
    setBriefLoad(true);
    try {
      const [briefRes, dashRes] = await Promise.all([
        blackPepperApi.dailyBrief(),
        dashboardApi.getOverview(),
      ]);
      setBrief(briefRes.data);
      setDashStats(dashRes.data?.summary ?? null);
    } catch { /* silent */ }
    finally { setBriefLoad(false); }
  }, []);

  useEffect(() => { if (isBlack) loadBrief(); }, [isBlack, loadBrief]);

  if (loading || !isBlack) return null;

  const bg      = dark ? '#0D1117' : '#f0f2f5';
  const cardBg  = dark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const txtMain = dark ? '#fff' : '#111';
  const txtMut  = dark ? 'rgba(255,255,255,0.4)' : '#888';
  const GOLD    = '#f59e0b';

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(n) + ' TND';

  const metrics: QuickStat[] = [
    {
      label: 'Revenue',
      value: dashStats ? fmt(dashStats.total_revenue ?? 0) : '—',
      color: '#db142e',
      icon: DollarSign,
    },
    {
      label: 'Orders',
      value: dashStats ? String(dashStats.total_orders ?? 0) : '—',
      color: '#60a5fa',
      icon: ShoppingBag,
    },
    {
      label: 'Trending',
      value: brief ? `${brief.trending_count} products` : '—',
      color: '#34d399',
      icon: TrendingUp,
    },
    {
      label: 'At Risk',
      value: brief ? `${brief.risk_count} products` : '—',
      color: brief?.risk_count ? '#f87171' : '#34d399',
      icon: AlertTriangle,
    },
  ];

  const features: FeatureCard[] = [
    {
      href:     '/seller/black/ai-intelligence',
      title:    'AI Intelligence',
      subtitle: 'Trending products, stock alerts and real-time market insights powered by AI.',
      icon:     Brain,
      accent:   '#a78bfa',
      badge:    brief?.trending_count ? { text: `${brief.trending_count} trending`, color: '#a78bfa' } : undefined,
    },
    {
      href:     '/seller/black/visitor-insights',
      title:    'Visitor Insights',
      subtitle: 'See which products attract visitors but don\'t convert — and fix them fast.',
      icon:     Eye,
      accent:   '#60a5fa',
    },
    {
      href:     '/seller/black/listing-quality',
      title:    'Listing Quality',
      subtitle: 'Product quality scores with step-by-step improvement tips for each listing.',
      icon:     Star,
      accent:   '#c084fc',
    },
    {
      href:     '/seller/black/smart-promotions',
      title:    'Smart Promotions',
      subtitle: 'AI detects your hottest products and recommends the best time to sponsor them.',
      icon:     TrendingUp,
      accent:   GOLD,
    },
    {
      href:     '/seller/black/profit',
      title:    'Profit Center',
      subtitle: 'Revenue breakdown, margin analysis, and a 30-day forecast for your store.',
      icon:     DollarSign,
      accent:   '#34d399',
    },
    {
      href:     '/seller/black/vip-lounge',
      title:    'VIP Lounge',
      subtitle: 'Request reels, custom promotions, or priority support directly from our team.',
      icon:     Users,
      accent:   GOLD,
      badge:    { text: 'Exclusive', color: GOLD },
    },
  ];

  return (
    <>
      <style>{`
        @keyframes bk-fadeup { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .bk-section { animation: bk-fadeup 0.4s ease forwards; opacity: 0; }
        .bk-section:nth-child(1){animation-delay:0.05s}
        .bk-section:nth-child(2){animation-delay:0.1s}
        .bk-section:nth-child(3){animation-delay:0.15s}
        .bk-section:nth-child(4){animation-delay:0.2s}
        .bk-section:nth-child(5){animation-delay:0.25s}
        .elite-metric-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
        .elite-feature-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.15); border-color: rgba(245,158,11,0.25) !important; }
        .elite-quick-action:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Welcome strip ── */}
        <div className="bk-section" style={{
          background: dark
            ? 'linear-gradient(135deg,#1a1206 0%,#2d1f08 60%,#1a1206 100%)'
            : 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)',
          borderRadius: 20, border: '1px solid rgba(245,158,11,0.3)',
          padding: '22px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            borderRadius: '50%', background: 'rgba(245,158,11,0.07)', filter: 'blur(50px)',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.15))',
                border: '1px solid rgba(245,158,11,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Crown size={19} color={GOLD} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Today's Brief
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                    background: 'rgba(245,158,11,0.15)', color: GOLD,
                    border: '1px solid rgba(245,158,11,0.35)',
                  }}>⬛ BLACK ELITE</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, color: txtMain, margin: 0 }}>
                  {briefLoad ? 'Loading…' : (brief?.greeting ?? 'Good morning!')}
                </p>
              </div>
            </div>

            <button
              onClick={loadBrief}
              disabled={briefLoad}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: txtMut, padding: 4, borderRadius: 6, flexShrink: 0,
                opacity: briefLoad ? 0.5 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: briefLoad ? 'bk-spin 0.8s linear infinite' : 'none' }} />
              <style>{'@keyframes bk-spin{to{transform:rotate(360deg)}}'}</style>
            </button>
          </div>

          {!briefLoad && brief?.ai_message && (
            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <Sparkles size={13} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: txtMain, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                {brief.ai_message}
              </p>
            </div>
          )}

          {!briefLoad && brief?.top_action && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: txtMut, fontWeight: 600 }}>
                Priority: <span style={{ color: txtMain, fontWeight: 700 }}>{brief.top_action.label}</span>
              </span>
              <Link href={brief.top_action.href} style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 9,
                background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                color: '#000', fontSize: 11, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              }}>
                Do it now <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>

        {/* ── 4 Metric cards ── */}
        <div className="bk-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {metrics.map(m => (
            <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} accent={m.color} dark={dark} />
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div className="bk-section" style={{
          background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: '16px 20px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: txtMut, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Quick Actions
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <QuickAction href="/seller/products/new"          label="Add Product"      icon={Package}     accent="#db142e" dark={dark} />
            <QuickAction href="/seller/black/ai-intelligence" label="Run AI Tools"     icon={Brain}       accent="#a78bfa" dark={dark} />
            <QuickAction href="/seller/promote"               label="Boost a Product"  icon={Zap}         accent={GOLD}    dark={dark} />
            <QuickAction href="/seller/black/profit"          label="View Earnings"    icon={DollarSign}  accent="#34d399" dark={dark} />
            <QuickAction href="/seller/black/vip-lounge"      label="VIP Request"      icon={Crown}       accent={GOLD}    dark={dark} />
          </div>
        </div>

        {/* ── Feature gateway cards ── */}
        <div className="bk-section">
          <p style={{ fontSize: 11, fontWeight: 800, color: txtMut, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Your Black Elite Features
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {features.map(f => (
              <FeatureGatewayCard key={f.href} {...f} dark={dark} />
            ))}
          </div>
        </div>

       
      </div>
    </>
  );
}