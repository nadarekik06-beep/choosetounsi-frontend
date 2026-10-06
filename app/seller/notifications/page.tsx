'use client'

// Every seller notification (orders, stock, reviews, ads…), newest first.
// The Topbar bell shows the latest ones; this page is its "view all".

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from '../SellerShell';
import { NotifIcon, accent } from '@/app/components/NotificationBell';
import {
  sellerNotificationApi, announceNotificationsChanged, type AppNotification,
} from '@/lib/notificationApi';
import { useFormat } from '@/lib/i18n/useFormat';
import BrandLoader, { BusyLabel } from '@/components/brand/BrandLoader'
import { useBrandLoading } from '@/hooks/useBrandLoading'
import { usePageLoading } from '@/components/brand/NavigationLoader'

type Filter = 'all' | 'unread';

export default function SellerNotificationsPage() {
  const { dark } = useTheme();
  const t = useTranslations('seller.notificationsPage');
  const router = useRouter();
  const { relative, date } = useFormat();

  const [filter,   setFilter]   = useState<Filter>('all');
  const [items,    setItems]    = useState<AppNotification[]>([]);
  const [page,     setPage]     = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading,  setLoading]  = useState(true);
  // holds the navigation loader until the first load is done
  usePageLoading(loading);
  const showLoader = useBrandLoading(loading);
  const [error,    setError]    = useState(false);

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    setLoading(true);
    setError(false);
    try {
      const res = await sellerNotificationApi.getAll(nextPage, filter === 'unread');
      setItems(prev => (replace ? res.data : [...prev, ...res.data]));
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(1, true); }, [load]);

  const markRead = async (n: AppNotification) => {
    if (n.is_read) return;
    setItems(prev => filter === 'unread'
      ? prev.filter(x => x.id !== n.id)
      : prev.map(x => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x)));
    try { await sellerNotificationApi.markRead(n.id); } catch { /* next load shows the real state */ }
    announceNotificationsChanged();
  };

  const markAllRead = async () => {
    setItems(prev => (filter === 'unread' ? [] : prev.map(x => ({ ...x, is_read: true, read_at: x.read_at ?? new Date().toISOString() }))));
    try { await sellerNotificationApi.markAllRead(); } catch { load(1, true); }
    announceNotificationsChanged();
  };

  const open = async (n: AppNotification) => {
    await markRead(n);
    if (n.data.link) router.push(n.data.link);
  };

  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.55)' : '#5b6472';
  const hoverBg   = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';
  const hasUnread = items.some(n => !n.is_read);

  const tab = (value: Filter) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      style={{
        padding: '8px 14px', minHeight: 36, borderRadius: 10, cursor: 'pointer',
        fontSize: 12, fontWeight: 800,
        border: `1px solid ${filter === value ? 'rgba(219,20,46,0.35)' : border}`,
        background: filter === value ? 'rgba(219,20,46,0.12)' : 'transparent',
        color: filter === value ? '#db142e' : textMuted,
      }}
    >
      {t(value)}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .ntf-row:hover { background: ${hoverBg} !important; }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
        <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{t('subtitle')}</p>
      </div>

      {/* Filters + mark all */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {tab('all')}
        {tab('unread')}
        {hasUnread && (
          <button
            onClick={markAllRead}
            style={{
              marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', minHeight: 36, borderRadius: 10, cursor: 'pointer',
              fontSize: 12, fontWeight: 700, background: 'transparent',
              border: `1px solid ${border}`, color: textMuted,
            }}
          >
            <CheckCheck size={14} /> {t('markAllRead')}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
        {showLoader && items.length === 0 ? (
          <BrandLoader variant="section" theme={dark ? 'dark' : 'light'} minHeight={220} />
        ) : error && items.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: textMuted, fontSize: 13 }}>
            {t('error')}{' '}
            <button onClick={() => load(1, true)} style={{ background: 'none', border: 'none', color: '#db142e', fontWeight: 800, cursor: 'pointer' }}>{t('retry')}</button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '56px 16px', textAlign: 'center' }}>
            <Bell size={32} style={{ color: textMuted, opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: 0 }}>
              {filter === 'unread' ? t('emptyUnread') : t('empty')}
            </p>
          </div>
        ) : (
          items.map((n, i) => {
            const a = accent(n.data.action);
            return (
              <div
                key={n.id}
                className="ntf-row"
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${border}`,
                  background: n.is_read ? 'transparent' : `${a}0d`,
                }}
              >
                <button
                  onClick={() => open(n)}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: 'none', border: 'none', padding: 0, cursor: n.data.link ? 'pointer' : 'default',
                    textAlign: 'start', color: 'inherit',
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0, color: a,
                    background: `${a}18`, border: `1px solid ${a}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <NotifIcon icon={n.data.icon} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block', fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere',
                      fontWeight: n.is_read ? 600 : 800, color: n.is_read ? textMuted : textMain,
                    }}>
                      {n.data.title}
                    </span>
                    {n.data.body && (
                      <span style={{ display: 'block', fontSize: 12, lineHeight: 1.5, color: textMuted, marginTop: 2, overflowWrap: 'anywhere' }}>
                        {n.data.body}
                      </span>
                    )}
                    <span title={date(n.created_at, 'datetime')} style={{ display: 'block', fontSize: 11, color: textMuted, marginTop: 4 }}>
                      {relative(n.created_at)}
                    </span>
                  </span>
                </button>

                {!n.is_read && (
                  <button
                    onClick={() => markRead(n)}
                    title={t('markRead')}
                    aria-label={t('markRead')}
                    style={{
                      width: 32, height: 32, flexShrink: 0, borderRadius: 8, cursor: 'pointer',
                      background: 'transparent', border: `1px solid ${border}`, color: textMuted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {page < lastPage && items.length > 0 && (
        <button
          onClick={() => load(page + 1, false)}
          disabled={loading}
          style={{
            alignSelf: 'center', padding: '10px 18px', minHeight: 40, borderRadius: 10,
            fontSize: 12, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
            background: 'transparent', border: `1px solid ${border}`, color: textMain,
          }}
        >
          <BusyLabel busy={loading}>{t('loadMore')}</BusyLabel>
        </button>
      )}
    </div>
  );
}
