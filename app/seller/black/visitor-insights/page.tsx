'use client';
/**
 * app/seller/black/visitor-insights/page.tsx — Analyse des visiteurs (Black Pepper)
 *
 * Where and why buyers drop off: impressions → clicks → views → cart → checkout → order.
 * Sections: period + KPIs · store funnel · traffic sources & devices · "À corriger cette
 * semaine" (top 3 by lost revenue) · products grouped by drop-off stage · results of
 * applied actions. Data: GET /seller/black/visitor-insights (daily aggregates).
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../SellerShell';
import { ink } from '@/app/seller/ink';
import { useFormat } from '@/lib/i18n/useFormat';
import BrandLoader from '@/components/brand/BrandLoader';
import { RouteLoading, usePageLoading } from '@/components/brand/NavigationLoader';
import { blackPepperApi, type VisitorInsightsData } from '@/lib/blackPepperApi';
import { usePalette } from '@/app/seller/growth-radar/_components/ui';
import {
  ActionResults, Card, FixCards, FunnelChart, KpiCards, Skeleton, StageGroups, StarterState, TrafficChart, useFmt,
} from './_components/sections';

type Period = 7 | 30 | 90;
const PERIODS: Period[] = [7, 30, 90];
const PERIOD_KEY = 'ct_vi_period';

function VisitorInsightsInner() {
  const { dark } = useTheme();
  const { isBlack, loading: planLoading } = useSubscription();
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations('seller.insights');
  const { date } = useFormat();
  const f = useFmt();
  const p = usePalette(dark);

  const [period, setPeriod] = useState<Period>(() => {
    try { const v = Number(localStorage.getItem(PERIOD_KEY)); return (PERIODS as number[]).includes(v) ? v as Period : 30; } catch { return 30; }
  });
  const [result, setResult] = useState<{ period: Period; data: VisitorInsightsData } | null>(null);
  const [failed, setFailed] = useState<Period | null>(null);
  const [attempt, setAttempt] = useState(0);
  usePageLoading(planLoading);

  useEffect(() => { if (!planLoading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, planLoading, router]);

  useEffect(() => {
    if (!isBlack) return;
    let live = true;
    blackPepperApi.visitorInsights(period)
      .then(r => { if (live) setResult({ period, data: r.data }); })
      .catch(() => { if (live) setFailed(period); });
    return () => { live = false; };
  }, [isBlack, period, attempt]);

  const error = failed === period;
  const loading = !error && result?.period !== period;
  const data = result?.data ?? null;
  const retry = useCallback(() => { setFailed(null); setAttempt(a => a + 1); }, []);

  const choose = (d: Period) => {
    setPeriod(d);
    try { localStorage.setItem(PERIOD_KEY, String(d)); } catch { /* private mode */ }
  };

  // ?product=ID (from Growth Radar or a notification): scroll to that product and highlight it
  const focus = Number(params.get('product')) || null;
  useEffect(() => {
    if (!focus || !data) return;
    const el = document.getElementById(`vi-p-${focus}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('vi-focus');
    const id = setTimeout(() => el.classList.remove('vi-focus'), 2600);
    return () => clearTimeout(id);
  }, [focus, data]);

  if (planLoading || !isBlack) return <BrandLoader variant="section" size="lg" minHeight="60vh" theme={dark ? 'dark' : 'light'} />;

  return (
    <div className="vi-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .vi-flip { transform: none; }
        [dir="rtl"] .vi-flip { transform: scaleX(-1); }
        .vi-shimmer { animation: vi-pulse 1.4s ease-in-out infinite; }
        @keyframes vi-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
        .vi-target { transition: box-shadow .3s ease; }
        .vi-focus { box-shadow: 0 0 0 3px ${ink('#3b82f6', dark)}88; }
        @media (prefers-reduced-motion: reduce) { .vi-shimmer { animation: none } }
      `}</style>

      {/* Header + period */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
            color: ink('#3b82f6', dark), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Eye size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: p.text, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
            <p style={{ fontSize: 12.5, color: p.muted, margin: 0, maxWidth: 620 }}>{t('subtitle')}</p>
          </div>
        </div>
        <div role="radiogroup" aria-label={t('period.label')}
          style={{ display: 'flex', gap: 4, background: p.sub, border: `1px solid ${p.border}`, borderRadius: 12, padding: 4 }}>
          {PERIODS.map(d => (
            <button key={d} type="button" role="radio" aria-checked={period === d} onClick={() => choose(d)} style={{
              padding: '7px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
              background: period === d ? p.bg : 'transparent', color: period === d ? p.text : p.muted,
              boxShadow: period === d ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}>{t('period.days', { count: d })}</button>
          ))}
        </div>
      </div>

      {data && !loading && (
        <p style={{ fontSize: 11.5, color: p.muted, margin: '-6px 0 0' }}>
          {t('period.range', { from: date(data.period.from, 'dayMonth'), to: date(data.period.to, 'dayMonth'),
            pfrom: date(data.period.previous_from, 'dayMonth'), pto: date(data.period.previous_to, 'dayMonth') })}
        </p>
      )}

      {error && !loading && (
        <Card p={p} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: p.muted, margin: '0 0 10px' }}>{t('error')}</p>
          <button type="button" onClick={retry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${p.border}`, background: p.bg, color: p.text, fontWeight: 700, cursor: 'pointer' }}>
            <RefreshCw size={14} />{t('retry')}
          </button>
        </Card>
      )}

      {loading && <Skeleton dark={dark} />}

      {!loading && data && (
        <>
          {data.state !== 'ok' && <StarterState state={data.state} dark={dark} />}
          {data.state !== 'no_products' && (
            <>
              <KpiCards kpis={data.kpis} dark={dark} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 14 }}>
                <FunnelChart data={data} dark={dark} />
                <TrafficChart data={data} dark={dark} />
              </div>
              {data.fix_this_week.length > 0 ? (
                <FixCards items={data.fix_this_week} dark={dark} />
              ) : (
                <Card p={p}>
                  <p style={{ fontSize: 13, color: p.muted, margin: 0 }}>
                    {data.summary.products - data.summary.insufficient > 0
                      ? t('fix.noneFound', { count: data.summary.products - data.summary.insufficient })
                      : t('fix.noneYet')}
                  </p>
                </Card>
              )}
              <StageGroups data={data} dark={dark} />
              {data.summary.lost_revenue > 0 && (
                <p style={{ fontSize: 11.5, color: p.muted, margin: '-6px 0 0' }}>{t('lostExplained', { amount: f.money(data.summary.lost_revenue) })}</p>
              )}
            </>
          )}
          {data.state !== 'no_products' && <ActionResults actions={data.actions} dark={dark} />}
        </>
      )}
    </div>
  );
}

export default function VisitorInsightsPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <VisitorInsightsInner />
    </Suspense>
  );
}
