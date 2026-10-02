'use client'

/**
 * Customer profile: hero (avatar + completion ring), real stats from
 * GET /api/profile/overview, and tabs — Overview · Orders · Addresses ·
 * Favorites · Reviews · Complaints · Settings. The active tab lives in the
 * URL (?tab=reviews) so every section can be linked to.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutGrid, ShoppingBag, MapPin, Heart, Star, AlertTriangle, Settings, RefreshCw,
} from 'lucide-react'
import { isAuthenticated, logout } from '@/lib/auth'
import { profileApi, syncSessionUser, type ApiError, type CompletionField, type Profile, type ProfileOverview } from '@/lib/profileApi'
import { Toast, useToast } from '@/components/profile/ui'
import ProfileHero from './_components/ProfileHero'
import OverviewTab from './_components/OverviewTab'
import OrdersTab from './_components/OrdersTab'
import AddressesTab from './_components/AddressesTab'
import FavoritesTab from './_components/FavoritesTab'
import ReviewsTab from './_components/ReviewsTab'
import ComplaintsTab from './_components/ComplaintsTab'
import SettingsTab from './_components/SettingsTab'
import { TABS, isTab, type TabKey } from './_components/tabs'
import '@/components/profile/profile.css'

const TAB_ICONS: Record<TabKey, React.ReactNode> = {
  overview: <LayoutGrid size={16} />, orders: <ShoppingBag size={16} />, addresses: <MapPin size={16} />,
  favorites: <Heart size={16} />, reviews: <Star size={16} />, complaints: <AlertTriangle size={16} />,
  settings: <Settings size={16} />,
}

export default function ProfilePage() {
  const t      = useTranslations('profile')
  const router = useRouter()
  const { toast, show } = useToast()

  const [data,    setData]    = useState<ProfileOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [tab,     setTab]     = useState<TabKey>('overview')
  const [autoAdd, setAutoAdd] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(false)
    try {
      const o = await profileApi.overview()
      setData(o)
      syncSessionUser(o.profile)
    } catch (e) {
      if ((e as ApiError).status === 401) { router.replace('/auth/login?callbackUrl=/profile'); return }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/auth/login?callbackUrl=/profile'); return }
    const q = new URLSearchParams(window.location.search).get('tab')
    if (isTab(q)) setTab(q)
    load()
  }, [load, router])

  const go = useCallback((next: TabKey) => {
    setTab(next)
    setAutoAdd(false)
    const url = next === 'overview' ? '/profile' : `/profile?tab=${next}`
    window.history.replaceState(null, '', url)
    document.querySelector('.pf-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const setProfile = useCallback((p: Profile) => {
    setData(d => (d ? { ...d, profile: p } : d))
  }, [])

  const onFix = (field: CompletionField) => {
    if (field === 'address') { go('addresses'); setAutoAdd(true); return }
    if (field === 'avatar') { document.querySelector<HTMLButtonElement>('.pf-avatar-btn')?.click(); return }
    go('settings')
    setTimeout(() => {
      const id = { first_name: 'pf-first', last_name: 'pf-last', phone: 'pf-phone', date_of_birth: 'pf-dob', gender: 'pf-gender-label' }[field]
      const el = document.getElementById(id)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true })
    }, 120)
  }

  const doLogout = async () => { await logout(); router.push('/auth/login') }

  const s = data?.stats
  const counts: Partial<Record<TabKey, number>> = s ? {
    orders: s.orders.total, addresses: s.addresses, favorites: s.favorites, reviews: s.reviews, complaints: s.complaints.open,
  } : {}

  return (
    <div className="pf-root">
      <ProfileHero profile={data?.profile ?? null} onProfile={p => { setProfile(p); load(true) }} onEdit={() => go('settings')} toast={show} />

      <main className="pf-wrap pf-body">
        <div className="pf-tabs" role="tablist" aria-label={t('tabs.label')}>
          {TABS.map(k => (
            <button key={k} type="button" role="tab" id={`pf-tab-${k}`} aria-selected={tab === k} aria-controls="pf-tabpanel"
              className="pf-tab" onClick={() => go(k)}>
              {TAB_ICONS[k]}{t(`tabs.${k}`)}
              {!!counts[k] && <span className="pf-count">{counts[k]! > 99 ? '99+' : counts[k]}</span>}
            </button>
          ))}
        </div>

        <div id="pf-tabpanel" role="tabpanel" aria-labelledby={`pf-tab-${tab}`}>
          {error ? (
            <div className="pf-card" style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 14px', fontWeight: 700 }}>{t('errors.load')}</p>
              <button type="button" className="pf-btn primary" onClick={() => load()}><RefreshCw size={15} />{t('errors.retry')}</button>
            </div>
          ) : tab === 'overview' ? (
            <OverviewTab data={data} loading={loading} go={go} onFix={onFix} onLogout={doLogout} />
          ) : tab === 'orders' ? (
            <OrdersTab data={data} loading={loading} />
          ) : tab === 'addresses' ? (
            <AddressesTab key={autoAdd ? 'add' : 'list'} profile={data?.profile ?? null} onChanged={() => load(true)} toast={show} autoAdd={autoAdd} />
          ) : tab === 'favorites' ? (
            <FavoritesTab />
          ) : tab === 'reviews' ? (
            <ReviewsTab />
          ) : tab === 'complaints' ? (
            <ComplaintsTab data={data} />
          ) : (
            <SettingsTab profile={data?.profile ?? null} onProfile={p => { setProfile(p); load(true) }} toast={show} onLogout={doLogout} />
          )}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  )
}
