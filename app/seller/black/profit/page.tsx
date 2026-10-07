'use client';

/**
 * app/seller/black/profit/page.tsx — Centre de profit (Black Pepper)
 *
 * Money, goals and profitability — nothing about traffic or listings (those live
 * in Statistiques, Analyse des visiteurs, Radar de croissance, Qualité des fiches).
 * Order: goal progress → next steps → money KPIs → gross → net breakdown →
 * products / ads / payouts → what-if → 6-month history (collapsed).
 * Data: GET /seller/black/profit-center (App\Services\Profit\ProfitCenter).
 * Non-Black sellers are redirected to /seller/subscription.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Crown, Download, Printer, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useTheme } from '../../SellerShell';
import { useFormat } from '@/lib/i18n/useFormat';
import BrandLoader from '@/components/brand/BrandLoader';
import { usePageLoading } from '@/components/brand/NavigationLoader';
import { blackPepperApi, type ProfitAlertSettings, type ProfitCenterData } from '@/lib/blackPepperApi';
import { Btn, Card, GOLD, Skeleton, usePalette } from './_components/ui';
import { GoalHero, GoalModal } from './_components/goal';
import {
  AdsReturn, Breakdown, FirstSale, History, Kpis, Payouts, PrintReport, Products, Simulator, Tips,
} from './_components/sections';

export default function ProfitCenterPage() {
  const { dark } = useTheme();
  const { isBlack, loading: planLoading } = useSubscription();
  const router = useRouter();
  const t = useTranslations('seller.profit');
  const { date } = useFormat();
  const p = usePalette(dark);
  usePageLoading(planLoading);

  const [data, setData] = useState<ProfitCenterData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [modal, setModal] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState(false);

  useEffect(() => { if (!planLoading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, planLoading, router]);

  useEffect(() => {
    if (!isBlack) return;
    let live = true;
    blackPepperApi.profitCenter()
      .then(r => { if (live) { setData(r.data); setError(false); } })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [isBlack, attempt]);

  const reload = useCallback(() => setAttempt(a => a + 1), []);
  const setAlerts = useCallback((alerts: ProfitAlertSettings) => setData(d => d ? { ...d, alerts } : d), []);

  const exportCsv = async (month: string) => {
    setExporting(month); setExportError(false);
    try { await blackPepperApi.exportProfitCsv(month); }
    catch { setExportError(true); }
    finally { setExporting(null); }
  };

  if (planLoading || !isBlack) return <BrandLoader variant="section" size="lg" minHeight="60vh" theme={dark ? 'dark' : 'light'} />;

  const loading = !data && !error;

  return (
    <div className="pc-page" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        .pc-shimmer { animation: pc-pulse 1.4s ease-in-out infinite; }
        @keyframes pc-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
        @media (prefers-reduced-motion: reduce) { .pc-shimmer { animation: none } }
        @media (max-width: 520px) { .pc-hide-sm { display: none } }
        .pc-print { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .pc-print, .pc-print * { visibility: visible !important; }
          .pc-print { display: block !important; position: absolute; inset: 0; padding: 24px; background: #fff; color: #111; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.12))', border: '1px solid rgba(245,158,11,0.45)', color: p.gold }}>
            <Crown size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: p.text, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
            <p style={{ fontSize: 12.5, color: p.muted, margin: 0, maxWidth: 620 }}>{t('subtitle')}</p>
          </div>
        </div>
        {data && data.state === 'active' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn p={p} onClick={() => exportCsv(data.month)} disabled={!!exporting} title={t('export.csvTip')}>
              <Download size={13} />{t('export.csv', { month: date(`${data.month}-01T12:00:00`, 'monthYear') })}
            </Btn>
            <Btn p={p} onClick={() => exportCsv(data.breakdown.previous.month)} disabled={!!exporting} title={t('export.csvTip')}>
              <Download size={13} />{t('export.csv', { month: date(`${data.breakdown.previous.month}-01T12:00:00`, 'monthYear') })}
            </Btn>
            <Btn p={p} onClick={() => window.print()} title={t('export.printTip')}><Printer size={13} />{t('export.print')}</Btn>
          </div>
        )}
      </div>
      {exportError && <p role="alert" style={{ fontSize: 12.5, color: p.red, margin: '-6px 0 0' }}>{t('export.failed')}</p>}

      {error && (
        <Card p={p} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: p.muted, margin: '0 0 10px' }}>{t('error')}</p>
          <Btn p={p} onClick={() => { setError(false); reload(); }}><RefreshCw size={14} />{t('retry')}</Btn>
        </Card>
      )}

      {loading && <Skeleton p={p} />}

      {data && (
        <>
          {data.state === 'new' ? (
            <>
              <FirstSale p={p} />
              <GoalHero data={data} p={p} onEdit={() => setModal(true)} onAlertsChange={setAlerts} />
            </>
          ) : (
            <>
              <GoalHero data={data} p={p} onEdit={() => setModal(true)} onAlertsChange={setAlerts} />
              <Tips tips={data.tips} p={p} onOpenGoal={() => setModal(true)} />
              <Kpis data={data} p={p} />
              <Breakdown data={data} p={p} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 14, alignItems: 'start' }}>
                <Products data={data} p={p} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                  <AdsReturn data={data} p={p} />
                  <Payouts data={data} p={p} />
                </div>
              </div>
              <Simulator data={data} p={p} />
              <History data={data} p={p} />
              <p style={{ fontSize: 11.5, color: p.faint, margin: 0 }}>
                {t('footnote')} <span style={{ color: GOLD }}>·</span> {t('timezone')}
              </p>
              <PrintReport data={data} />
            </>
          )}
        </>
      )}

      {modal && data && (
        <GoalModal data={data} p={p} onClose={() => setModal(false)} onSaved={() => { setModal(false); reload(); }} />
      )}
    </div>
  );
}
