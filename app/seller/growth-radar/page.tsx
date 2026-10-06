'use client';

/**
 * /seller/growth-radar — replaces Black Pepper "AI Intelligence" + "Intelligent Promotion".
 *
 * Black Pepper only (like the other /seller/black pages): other plans are sent to
 * /seller/subscription, and the API answers 403 for them.
 *
 * Weekly Growth Score + 3–7 action cards (precomputed nightly). Each card opens an
 * existing flow pre-filled; "Past actions" shows what was applied and its result.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Radar, RefreshCw } from 'lucide-react';
import { useTheme } from '../SellerShell';
import { useSubscription } from '@/app/hooks/useSubscription';
import { useFormat } from '@/lib/i18n/useFormat';
import { ink } from '@/app/seller/ink';
import BrandLoader from '@/components/brand/BrandLoader';
import { RouteLoading, usePageLoading } from '@/components/brand/NavigationLoader';
import {
  growthRadarApi, type ApiError, type GrowthCard, type GrowthHistory, type GrowthRadarData,
} from '@/lib/growthRadarApi';
import { ActionCard, EmptyState, ResultCard, ScoreHero } from './_components/cards';
import { BRAND_RED, usePalette } from './_components/ui';

type Tab = 'week' | 'history';

function GrowthRadarInner() {
  const { dark } = useTheme();
  const t = useTranslations('seller.growth');
  const { relative } = useFormat();
  const p = usePalette(dark);
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'history' ? 'history' : 'week';

  const { isBlack, loading: planLoading } = useSubscription();
  const [data, setData] = useState<GrowthRadarData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  usePageLoading(planLoading || (isBlack && !data && !error));

  useEffect(() => { if (!planLoading && !isBlack) router.replace('/seller/subscription'); }, [isBlack, planLoading, router]);

  const load = useCallback(() => {
    setError(false);
    growthRadarApi.get().then(r => setData(r.data)).catch(() => setError(true));
  }, []);
  useEffect(() => { if (isBlack) load(); }, [isBlack, load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setData((await growthRadarApi.refresh()).data);
    } catch (e) {
      if ((e as ApiError).response?.status === 429) setToast(t('cooldown'));
    } finally {
      setRefreshing(false);
    }
  };

  const removeCard = (id: number) =>
    setData(d => d ? { ...d, cards: d.cards.filter(c => c.id !== id) } : d);

  const dismiss = async (id: number) => {
    removeCard(id);
    setToast(t('dismissed'));
    await growthRadarApi.dismiss(id).catch(load);
  };
  const snooze = async (id: number, days: 3 | 7) => {
    removeCard(id);
    setToast(t('snoozedToast', { days }));
    setData(d => d ? { ...d, snoozed: d.snoozed + 1 } : d);
    await growthRadarApi.snooze(id, days).catch(load);
  };
  // Bundles have no save step we can hook: record when the seller opens the recommender
  const linkAction = (card: GrowthCard, kind: 'bundle') => { growthRadarApi.applied(card.id, kind).catch(() => {}); };

  const setTab = (next: Tab) => router.replace(next === 'week' ? '/seller/growth-radar' : '/seller/growth-radar?tab=history', { scroll: false });

  if (planLoading || !isBlack) return <BrandLoader variant="section" size="lg" minHeight="60vh" theme={dark ? 'dark' : 'light'} />;
  if (error && !data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: p.muted }}>
        <p>{t('error')}</p>
        <button type="button" onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.bg, color: p.text, fontWeight: 700, cursor: 'pointer' }}>{t('retry')}</button>
      </div>
    );
  }
  if (!data) return <BrandLoader variant="section" size="lg" minHeight="60vh" theme={dark ? 'dark' : 'light'} />;

  const cards = data.cards;

  return (
    <div className="gr-page" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${BRAND_RED}18`, border: `1px solid ${BRAND_RED}33`, color: ink(BRAND_RED, dark), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Radar size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: p.text, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
            <p style={{ fontSize: 12.5, color: p.muted, margin: 0, maxWidth: 620 }}>{t('subtitle')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.computed_at && <span style={{ fontSize: 11.5, color: p.muted }}>{t('updated', { time: relative(data.computed_at) })}</span>}
          <button type="button" onClick={refresh} disabled={refreshing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
            border: `1px solid ${p.border}`, background: p.bg, color: p.text, fontWeight: 700, fontSize: 12.5, cursor: refreshing ? 'wait' : 'pointer',
          }}>
            <RefreshCw size={14} className={refreshing ? 'gr-spin' : undefined} />{refreshing ? t('refreshing') : t('refresh')}
          </button>
        </div>
      </div>

      {data.score && <ScoreHero score={data.score} dark={dark} />}

      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 4, background: p.sub, border: `1px solid ${p.border}`, borderRadius: 12, padding: 4, alignSelf: 'flex-start' }}>
        {(['week', 'history'] as Tab[]).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} style={{
            padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
            background: tab === k ? p.bg : 'transparent', color: tab === k ? p.text : p.muted,
            boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
          }}>{t(`tabs.${k}`)}</button>
        ))}
      </div>

      {tab === 'week' && (
        <>
          {data.results.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: p.text }}>{t('results.title')}</h2>
              <div className="gr-grid">{data.results.map(a => <ResultCard key={a.id} action={a} dark={dark} />)}</div>
            </section>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: p.text }}>{t('feed.title')}</h2>
              <span style={{ fontSize: 11.5, color: p.muted }}>
                {t('feed.sortedBy')}{data.snoozed ? ` · ${t('feed.snoozed', { count: data.snoozed })}` : ''}
              </span>
            </div>
            {cards.length
              ? <div className="gr-grid">{cards.map(c => <ActionCard key={c.id} card={c} dark={dark} onDismiss={dismiss} onSnooze={snooze} onLinkAction={linkAction} />)}</div>
              : <EmptyState unlocks={data.score?.unlocks ?? []} dark={dark} />}
          </section>
        </>
      )}

      {tab === 'history' && <HistoryTab dark={dark} />}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 20, insetInlineStart: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: dark ? '#f8fafc' : '#111827', color: dark ? '#111827' : '#fff', padding: '10px 16px',
          borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 'calc(100vw - 32px)',
        }}>{toast}</div>
      )}

      <style>{`
        .gr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: 14px; align-items: start; }
        .gr-score { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; }
        .gr-subs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; }
        @media (max-width: 760px) { .gr-score { grid-template-columns: 1fr; } }
        @media (max-width: 420px) { .gr-subs { grid-template-columns: 1fr; } }
        [dir="rtl"] .gr-flip { transform: scaleX(-1); }
        .gr-spin { animation: gr-spin 0.9s linear infinite; }
        @keyframes gr-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function HistoryTab({ dark }: { dark: boolean }) {
  const t = useTranslations('seller.growth');
  const p = usePalette(dark);
  const [h, setH] = useState<GrowthHistory | null>(null);
  useEffect(() => { growthRadarApi.history().then(r => setH(r.data)).catch(() => setH({ actions: [], learning: null })); }, []);
  if (!h) return <BrandLoader variant="section" size="md" minHeight="30vh" theme={dark ? 'dark' : 'light'} />;

  const l = h.learning;
  const kinds = l ? Object.entries(l.by_kind) : [];
  const best = l?.best ? l.by_kind[l.best] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {kinds.length > 0 && l && (
        <section style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 16, padding: 16 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 900, color: p.text }}>{t('history.learning')}</h2>
          {best && l.best
            ? <p style={{ margin: 0, fontSize: 13, color: p.text }}>{t('history.best', {
                kind: t(`kinds.${l.best}`), lift: `${best.lift >= 0 ? '+' : ''}${Math.round(best.lift * 100)}%`, n: best.n,
              })}</p>
            : <p style={{ margin: 0, fontSize: 13, color: p.muted }}>{t('history.notYet', { min: l.min_actions })}</p>}
          <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 12.5, color: p.muted }}>
            {kinds.map(([k, s]) => <li key={k}>{t('history.kindStat', { kind: t(`kinds.${k}`), n: s.n, wins: s.wins })}</li>)}
          </ul>
        </section>
      )}
      {h.actions.length
        ? <div className="gr-grid">{h.actions.map(a => <ResultCard key={a.id} action={a} dark={dark} />)}</div>
        : <p style={{ fontSize: 13, color: p.muted }}>{t('history.empty')}</p>}
    </div>
  );
}

export default function GrowthRadarPage() {
  return (
    <Suspense fallback={<RouteLoading area minHeight="60vh" />}>
      <GrowthRadarInner />
    </Suspense>
  );
}
