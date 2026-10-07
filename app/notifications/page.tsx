'use client'

/**
 * Every notification the user got as a buyer (orders, payments, complaints,
 * reviews, promotions, account), newest first — the storefront bell's "view all".
 * A seller's dashboard notifications stay in /seller/notifications.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell, CheckCheck, ChevronRight, Settings, Trash2 } from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'
import {
  buyerNotificationApi, announceNotificationsChanged, type AppNotification,
} from '@/lib/notificationApi'
import { NotifIcon, accent } from '@/app/components/NotificationBell'
import { useFormat } from '@/lib/i18n/useFormat'
import { usePageLoading } from '@/components/brand/NavigationLoader'
import BrandLoader, { BusyLabel } from '@/components/brand/BrandLoader'

const RED = '#db142e'

/** Tabs: "all" + the buyer categories with a tab (account rows show under "all"). */
const TABS = ['all', 'orders', 'payments', 'complaints', 'reviews', 'promotions'] as const
type Tab = typeof TABS[number]

export default function NotificationsPage() {
  const t      = useTranslations('notificationsPage')
  const tc     = useTranslations('common')
  const router = useRouter()
  const { relative, date } = useFormat()

  const [tab,        setTab]        = useState<Tab>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [items,      setItems]      = useState<AppNotification[]>([])
  const [page,       setPage]       = useState(1)
  const [lastPage,   setLastPage]   = useState(1)
  const [unread,     setUnread]     = useState<Record<string, number>>({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  // holds the navigation loader until the first load is done
  usePageLoading(loading && items.length === 0)

  const category = tab === 'all' ? undefined : tab

  const loadUnread = useCallback(async () => {
    try {
      const s = await buyerNotificationApi.getUnreadSummary()
      setUnread({ ...s.by_category, all: s.count })
    } catch { /* badges are a nicety */ }
  }, [])

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    setLoading(true)
    setError(false)
    try {
      const res = await buyerNotificationApi.getAll(nextPage, unreadOnly, category)
      setItems(prev => (replace ? res.data : [...prev, ...res.data]))
      setPage(res.meta.current_page)
      setLastPage(res.meta.last_page)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [unreadOnly, category])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login?redirect=/notifications'); return }
    load(1, true)
  }, [load, router])

  useEffect(() => { if (isAuthenticated()) loadUnread() }, [loadUnread])

  const changed = () => { announceNotificationsChanged(); loadUnread() }

  const markRead = async (n: AppNotification) => {
    if (n.is_read) return
    setItems(prev => unreadOnly
      ? prev.filter(x => x.id !== n.id)
      : prev.map(x => (x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x)))
    try { await buyerNotificationApi.markRead(n.id) } catch { /* next load shows the real state */ }
    changed()
  }

  const markAllRead = async () => {
    setItems(prev => (unreadOnly ? [] : prev.map(x => ({ ...x, is_read: true, read_at: x.read_at ?? new Date().toISOString() }))))
    try { await buyerNotificationApi.markAllRead(category) } catch { load(1, true) }
    changed()
  }

  const remove = async (n: AppNotification) => {
    setItems(prev => prev.filter(x => x.id !== n.id))
    try { await buyerNotificationApi.remove(n.id) } catch { load(1, true) }
    changed()
  }

  const open = async (n: AppNotification) => {
    await markRead(n)
    if (n.data.link) router.push(n.data.link)
  }

  const hasUnread = items.some(n => !n.is_read)

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .np-tabs { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
        .np-tabs::-webkit-scrollbar { display:none; }
        .np-tab { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; padding:8px 14px; min-height:38px;
          border-radius:999px; border:1px solid #e5e7eb; background:#fff; color:#475569; font-size:13px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:all .15s; }
        .np-tab:hover { border-color:#fca5a5; color:${RED}; }
        .np-tab[aria-pressed="true"] { background:${RED}; border-color:${RED}; color:#fff; }
        .np-count { min-width:18px; height:18px; padding:0 5px; border-radius:999px; font-size:10px; font-weight:900;
          display:inline-flex; align-items:center; justify-content:center; background:rgba(219,20,46,.1); color:${RED}; }
        .np-tab[aria-pressed="true"] .np-count { background:rgba(255,255,255,.25); color:#fff; }
        .np-row { display:flex; gap:12px; align-items:flex-start; padding:14px 16px; border-top:1px solid #f1f5f9; transition:background .15s; }
        .np-row:first-child { border-top:none; }
        .np-row:hover { background:#f9fafb !important; }
        .np-icon-btn { width:34px; height:34px; flex-shrink:0; border-radius:9px; cursor:pointer; background:transparent;
          border:1px solid #e5e7eb; color:#64748b; display:flex; align-items:center; justify-content:center; }
        .np-icon-btn:hover { color:${RED}; border-color:#fca5a5; }
        .np-actions { display:flex; gap:6px; }
        @media (max-width: 520px) {
          .np-wrap { padding: 20px 16px 48px !important; }
          .np-actions { flex-direction:column; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Barlow', sans-serif" }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 860, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} />
            <Link href="/profile" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('account')}</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{t('title')}</span>
          </nav>
        </div>

        <div className="np-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px', animation: 'fadeUp 0.4s ease both' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color={RED} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('title')}</h1>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                {(unread.all ?? 0) > 0 ? t('unreadCount', { count: unread.all }) : t('subtitle')}
              </p>
            </div>
            <Link href="/profile?tab=settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569', textDecoration: 'none', padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff' }}>
              <Settings size={14} /> {t('settings')}
            </Link>
          </div>

          {/* Category tabs */}
          <div className="np-tabs" role="toolbar" aria-label={t('filters')}>
            {TABS.map(k => (
              <button key={k} className="np-tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
                {t(`tabs.${k}`)}
                {(unread[k] ?? 0) > 0 && <span className="np-count">{unread[k] > 99 ? '99+' : unread[k]}</span>}
              </button>
            ))}
          </div>

          {/* Unread filter + mark all */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} style={{ accentColor: RED, width: 16, height: 16 }} />
              {t('unreadOnly')}
            </label>
            {hasUnread && (
              <button onClick={markAllRead} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', minHeight: 36, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#fff', border: '1px solid #e5e7eb', color: '#475569', fontFamily: 'inherit' }}>
                <CheckCheck size={14} /> {t('markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            {loading && items.length === 0 ? (
              <BrandLoader variant="section" label={t('loading')} minHeight={220} />
            ) : error && items.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                {t('error')}{' '}
                <button onClick={() => load(1, true)} style={{ background: 'none', border: 'none', color: RED, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{t('retry')}</button>
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '56px 16px', textAlign: 'center' }}>
                <Bell size={36} color="#e2e8f0" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  {unreadOnly ? t('emptyUnread') : t(`empty.${tab}`)}
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{t('emptyHint')}</p>
              </div>
            ) : (
              items.map(n => {
                const a = accent(n.data.action)
                return (
                  <div key={n.id} className="np-row" style={{ background: n.is_read ? 'transparent' : `${a}0d` }}>
                    <button
                      onClick={() => open(n)}
                      style={{ flex: 1, minWidth: 0, display: 'flex', gap: 12, alignItems: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: n.data.link ? 'pointer' : 'default', textAlign: 'start', color: 'inherit', fontFamily: 'inherit' }}
                    >
                      <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, color: a, background: `${a}18`, border: `1px solid ${a}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <NotifIcon icon={n.data.icon} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!n.is_read && <span aria-label={t('unread')} style={{ width: 7, height: 7, borderRadius: '50%', background: a, flexShrink: 0 }} />}
                          <span style={{ fontSize: 14, lineHeight: 1.4, overflowWrap: 'anywhere', fontWeight: n.is_read ? 600 : 800, color: n.is_read ? '#475569' : '#0f172a' }}>
                            {n.data.title}
                          </span>
                        </span>
                        {n.data.body && (
                          <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: '#64748b', marginTop: 2, overflowWrap: 'anywhere' }}>
                            {n.data.body}
                          </span>
                        )}
                        <span title={date(n.created_at, 'datetime')} style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>
                          {relative(n.created_at)}
                        </span>
                      </span>
                    </button>

                    <span className="np-actions">
                      {!n.is_read && (
                        <button className="np-icon-btn" onClick={() => markRead(n)} title={t('markRead')} aria-label={t('markRead')}>
                          <CheckCheck size={15} />
                        </button>
                      )}
                      <button className="np-icon-btn" onClick={() => remove(n)} title={t('delete')} aria-label={t('delete')}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {page < lastPage && items.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => load(page + 1, false)}
                disabled={loading}
                style={{ padding: '10px 18px', minHeight: 40, borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', background: '#fff', border: '1px solid #e5e7eb', color: '#0f172a', fontFamily: 'inherit' }}
              >
                <BusyLabel busy={loading}>{t('loadMore')}</BusyLabel>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
