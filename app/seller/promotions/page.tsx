'use client'

import { useEffect, useState, useCallback } from 'react'
import { sellerPromotionsApi, type Promotion, type PromotionPayload } from '@/lib/promotionsApi'
import { sellerCouponsApi, type Coupon, type CouponStats } from '@/lib/couponsApi'
import { useTheme } from '../SellerShell'
import {
  Tag, Plus, Edit2, Trash2, AlertCircle, RefreshCw,
  Clock, CheckCircle, Zap, Calendar, TrendingDown,
  XCircle, Pause, Ticket, Users,
} from 'lucide-react'
import PromotionModal from './PromotionModal'
import CouponModal from './CouponModal'
import { useTranslations } from 'next-intl'
import { useFormat } from '@/lib/i18n/useFormat'

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  active:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', icon: <CheckCircle size={10} /> },
  scheduled: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', icon: <Clock size={10} /> },
  paused:    { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: <Pause size={10} /> },
  expired:   { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', icon: <XCircle size={10} /> },
}

export default function PromotionsPage() {
  const { dark } = useTheme()
  const t = useTranslations('seller.promotions')
  const { price, number } = useFormat()

  const bg        = dark ? '#0D1117' : '#f0f2f5'
  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff'    : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888'
  const subBg     = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc'

  const [section, setSection] = useState<'promotions' | 'coupons'>('promotions')

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [stats,      setStats]      = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  const [deleting,   setDeleting]   = useState<number | null>(null)
  const [modal,      setModal]      = useState<{ open: boolean; promotion: Promotion | null }>({
    open: false, promotion: null,
  })
  // Filter state
  const [typeFilter,   setTypeFilter]   = useState<'all' | 'flash_sale' | 'discount'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all')

  // ── Coupons ──
  const [coupons,      setCoupons]      = useState<Coupon[]>([])
  const [couponStats,  setCouponStats]  = useState<CouponStats | null>(null)
  const [couponLoading, setCouponLoading] = useState(true)
  const [couponError,  setCouponError]  = useState(false)
  const [couponDeleting, setCouponDeleting] = useState<number | null>(null)
  const [couponModal,  setCouponModal]  = useState<{ open: boolean; coupon: Coupon | null }>({
    open: false, coupon: null,
  })

  const loadCoupons = useCallback(() => {
    setCouponLoading(true); setCouponError(false)
    Promise.all([
      sellerCouponsApi.getAll({ per_page: 50 }),
      sellerCouponsApi.stats(),
    ])
      .then(([couponRes, statsRes]) => {
        setCoupons(couponRes.data?.data ?? couponRes.data ?? [])
        setCouponStats(statsRes.data)
      })
      .catch(() => setCouponError(true))
      .finally(() => setCouponLoading(false))
  }, [])

  useEffect(() => { if (section === 'coupons') loadCoupons() }, [section, loadCoupons])

  const handleCouponDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteCoupon'))) return
    setCouponDeleting(id)
    try {
      await sellerCouponsApi.delete(id)
      setCoupons(prev => prev.filter(c => c.id !== id))
    } catch {
      alert(t('deleteCouponFailed'))
    } finally {
      setCouponDeleting(null)
    }
  }

  const openCouponEdit = async (coupon: Coupon) => {
    try {
      const res = await sellerCouponsApi.getOne(coupon.id)
      setCouponModal({ open: true, coupon: res.data })
    } catch {
      setCouponModal({ open: true, coupon })
    }
  }

  const load = useCallback(() => {
    setLoading(true); setError(false)
    const params: Record<string, any> = { per_page: 50 }
    if (typeFilter   !== 'all') params.type   = typeFilter
    if (statusFilter !== 'all') params.status = statusFilter

    Promise.all([
      sellerPromotionsApi.getAll(params),
      sellerPromotionsApi.stats(),
    ])
      .then(([promoRes, statsRes]) => {
        setPromotions(promoRes.data?.data ?? promoRes.data ?? [])
        setStats(statsRes.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [typeFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return
    setDeleting(id)
    try {
      await sellerPromotionsApi.delete(id)
      setPromotions(prev => prev.filter(p => p.id !== id))
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeleting(null)
    }
  }

  const openEdit = async (promo: Promotion) => {
    try {
      const res = await sellerPromotionsApi.getOne(promo.id)
      setModal({ open: true, promotion: res.data })
    } catch {
      setModal({ open: true, promotion: promo })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={20} color="#db142e" /> {t('title')}
          </h1>
          <p style={{ fontSize: 12, color: textMuted, margin: '3px 0 0' }}>
            {section === 'promotions' ? t('subtitlePromotions') : t('subtitleCoupons')}
          </p>
        </div>
        <button
          onClick={() => section === 'promotions'
            ? setModal({ open: true, promotion: null })
            : setCouponModal({ open: true, coupon: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: 'linear-gradient(135deg,#db142e,#a00f22)',
            color: '#fff', fontWeight: 800, fontSize: 13,
            borderRadius: 12, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(219,20,46,0.35)',
          }}
        >
          <Plus size={15} /> {section === 'promotions' ? t('newPromotion') : t('newCoupon')}
        </button>
      </div>

      {/* ── Section tabs ── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${border}` }}>
        {([
          { key: 'promotions' as const, label: t('tabs.promotions'), Icon: Tag },
          { key: 'coupons'    as const, label: t('tabs.coupons'),    Icon: Ticket },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, padding: '10px 4px', background: 'none', border: 'none',
              borderBottom: section === tab.key ? '2.5px solid #db142e' : '2.5px solid transparent',
              color: section === tab.key ? textMain : textMuted, cursor: 'pointer', marginBottom: -1,
            }}
          >
            <tab.Icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {section === 'promotions' && (
      <>
      {/* ── Stats row ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: t('stats.total'),      value: stats.total,       color: textMain },
            { label: t('stats.active'),     value: stats.active,      color: '#10b981' },
            { label: t('stats.scheduled'),  value: stats.scheduled,   color: '#f59e0b' },
            { label: t('stats.flashSales'), value: stats.flash_sales, color: '#dc2626' },
            { label: t('stats.discounts'),  value: stats.discounts,   color: '#059669' },
          ].map(s => (
            <div key={s.label} style={{
              background: cardBg, border: `1px solid ${border}`,
              borderRadius: 14, padding: '14px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: '0 0 3px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Type filter */}
        {(['all', 'flash_sale', 'discount'] as const).map(type => (
          <button key={type} onClick={() => setTypeFilter(type)} style={{
            padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            border: `1.5px solid ${typeFilter === type ? '#db142e' : border}`,
            background: typeFilter === type
              ? dark ? 'rgba(219,20,46,0.15)' : 'rgba(219,20,46,0.07)'
              : 'transparent',
            color: typeFilter === type ? '#db142e' : textMuted,
            cursor: 'pointer', transition: 'all 0.13s',
          }}>
            {t(`typeFilters.${type}`)}
          </button>
        ))}
        <div style={{ width: 1, background: border, margin: '0 4px' }} />
        {/* Status filter */}
        {(['all', 'active', 'scheduled', 'expired'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            border: `1.5px solid ${statusFilter === s ? '#6366f1' : border}`,
            background: statusFilter === s
              ? dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.07)'
              : 'transparent',
            color: statusFilter === s ? '#6366f1' : textMuted,
            cursor: 'pointer', transition: 'all 0.13s',
          }}>
            {t(`statusFilters.${s}`)}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textMuted }}>{t('loading')}</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} color="#db142e" style={{ margin: '0 auto 10px', display: 'block' }} />
          <p style={{ color: textMuted, fontSize: 13 }}>{t('loadFailed')}</p>
          <button onClick={load} style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#db142e', color: '#fff',
            fontWeight: 700, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>
            <RefreshCw size={12} /> {t('retry')}
          </button>
        </div>
      ) : promotions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: cardBg, borderRadius: 18, border: `1px solid ${border}`,
        }}>
          <Tag size={40} style={{ color: textMuted, opacity: 0.3, margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontWeight: 800, color: textMain, fontSize: 15, margin: '0 0 6px' }}>{t('empty')}</p>
          <p style={{ fontSize: 13, color: textMuted, margin: '0 0 20px' }}>
            {t('emptyHint')}
          </p>
          <button
            onClick={() => setModal({ open: true, promotion: null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg,#db142e,#a00f22)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              borderRadius: 12, border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> {t('newPromotion')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {promotions.map(promo => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              dark={dark}
              cardBg={cardBg}
              border={border}
              textMain={textMain}
              textMuted={textMuted}
              subBg={subBg}
              onEdit={() => openEdit(promo)}
              onDelete={() => handleDelete(promo.id)}
              deleting={deleting === promo.id}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modal.open && (
        <PromotionModal
          promotion={modal.promotion}
          onClose={() => setModal({ open: false, promotion: null })}
          onSaved={() => { setModal({ open: false, promotion: null }); load() }}
        />
      )}
      </>
      )}

      {section === 'coupons' && (
      <>
      {/* ── Stats row ── */}
      {couponStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: t('couponStats.total'),       value: number(couponStats.total),             color: textMain },
            { label: t('couponStats.active'),      value: number(couponStats.active),            color: '#10b981' },
            { label: t('couponStats.redemptions'), value: number(couponStats.total_redemptions), color: '#6366f1' },
            { label: t('couponStats.discount'),    value: price(couponStats.total_discount_given), color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: '0 0 3px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {couponLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textMuted }}>{t('loading')}</div>
      ) : couponError ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} color="#db142e" style={{ margin: '0 auto 10px', display: 'block' }} />
          <p style={{ color: textMuted, fontSize: 13 }}>{t('couponsLoadFailed')}</p>
          <button onClick={loadCoupons} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#db142e', color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={12} /> {t('retry')}
          </button>
        </div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: cardBg, borderRadius: 18, border: `1px solid ${border}` }}>
          <Ticket size={40} style={{ color: textMuted, opacity: 0.3, margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontWeight: 800, color: textMain, fontSize: 15, margin: '0 0 6px' }}>{t('couponsEmpty')}</p>
          <p style={{ fontSize: 13, color: textMuted, margin: '0 0 20px' }}>
            {t('couponsEmptyHint')}
          </p>
          <button onClick={() => setCouponModal({ open: true, coupon: null })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#db142e,#a00f22)', color: '#fff', fontWeight: 800, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> {t('newCoupon')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {coupons.map(coupon => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              cardBg={cardBg}
              border={border}
              textMain={textMain}
              textMuted={textMuted}
              subBg={subBg}
              onEdit={() => openCouponEdit(coupon)}
              onDelete={() => handleCouponDelete(coupon.id)}
              deleting={couponDeleting === coupon.id}
            />
          ))}
        </div>
      )}

      {couponModal.open && (
        <CouponModal
          coupon={couponModal.coupon}
          onClose={() => setCouponModal({ open: false, coupon: null })}
          onSaved={() => { setCouponModal({ open: false, coupon: null }); loadCoupons() }}
        />
      )}
      </>
      )}

      <style>{`.promo-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.15)!important}`}</style>
    </div>
  )
}

// ── Coupon Card ─────────────────────────────────────────────────────────────────

function CouponCard({
  coupon, cardBg, border, textMain, textMuted, subBg, onEdit, onDelete, deleting,
}: {
  coupon: Coupon
  cardBg: string; border: string; textMain: string; textMuted: string; subBg: string
  onEdit: () => void; onDelete: () => void; deleting: boolean
}) {
  const t = useTranslations('seller.promotions')
  const { price } = useFormat()
  return (
    <div
      className="promo-card"
      style={{
        background: cardBg, borderRadius: 18, border: `1px solid ${border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="rtl-flip" style={{ height: 4, background: 'linear-gradient(90deg,#dc2626,#f97316)' }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.04em', color: textMain, background: subBg, padding: '3px 9px', borderRadius: 8, border: `1px solid ${border}` }}>
            {coupon.code}
          </span>
          <span style={{
            marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
            background: coupon.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
            color: coupon.is_active ? '#10b981' : '#64748b',
          }}>
            {coupon.is_active ? <CheckCircle size={10} /> : <Pause size={10} />} {coupon.is_active ? t('active') : t('paused')}
          </span>
        </div>

        <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#dc2626' }}>{coupon.discount_label}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {coupon.min_order_amount != null && (
            <div style={{ fontSize: 11, color: textMuted }}>
              {t.rich('minOrder', { amount: price(coupon.min_order_amount), b: (chunks) => <span style={{ color: textMain, fontWeight: 700 }}>{chunks}</span> })}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textMuted }}>
            <Users size={11} />
            {coupon.usage_limit != null
              ? t('usedOf', { used: coupon.usage_count, limit: coupon.usage_limit })
              : t('used', { used: coupon.usage_count })}
            {coupon.usage_limit_per_customer != null && ` · ${t('perCustomer', { max: coupon.usage_limit_per_customer })}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Tag size={11} color={textMuted} />
          <span style={{ fontSize: 11, color: textMuted }}>
            {t('productsCount', { count: coupon.products_count })}
          </span>
          {coupon.products.slice(0, 3).map(p => (
            <span key={p.id} style={{ fontSize: 10, fontWeight: 700, color: textMuted, background: subBg, border: `1px solid ${border}`, padding: '2px 7px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
              {p.name}
            </span>
          ))}
          {coupon.products_count > 3 && <span style={{ fontSize: 10, color: textMuted }}>+{coupon.products_count - 3}</span>}
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
        <button onClick={onEdit} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          <Edit2 size={12} /> {t('edit')}
        </button>
        <button onClick={onDelete} disabled={deleting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
          <Trash2 size={12} /> {deleting ? '…' : t('delete')}
        </button>
      </div>
    </div>
  )
}

// ── Promotion Card ─────────────────────────────────────────────────────────────

function PromotionCard({
  promo, dark, cardBg, border, textMain, textMuted, subBg, onEdit, onDelete, deleting,
}: {
  promo: Promotion; dark: boolean
  cardBg: string; border: string; textMain: string; textMuted: string; subBg: string
  onEdit: () => void; onDelete: () => void; deleting: boolean
}) {
  const t = useTranslations('seller.promotions')
  const { date } = useFormat()
  const fmtDate = (iso: string) => date(iso, 'datetime')
  const st = STATUS_STYLES[promo.status] ?? STATUS_STYLES.expired

  return (
    <div
      className="promo-card"
      style={{
        background: cardBg, borderRadius: 18, border: `1px solid ${border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Top colour bar ── */}
      <div className="rtl-flip" style={{
        height: 4,
        background: promo.type === 'flash_sale'
          ? 'linear-gradient(90deg,#dc2626,#f97316)'
          : 'linear-gradient(90deg,#059669,#10b981)',
      }} />

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Row 1: type badge + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 999,
            background: promo.type === 'flash_sale' ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)',
            color: promo.type === 'flash_sale' ? '#dc2626' : '#059669',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {promo.type === 'flash_sale' ? t('flashSale') : t('discount')}
          </span>
          <span style={{
            marginInlineStart: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
            background: st.bg, color: st.color,
          }}>
            {st.icon} {t.has(`status.${promo.status}`) ? t(`status.${promo.status}`) : promo.status}
          </span>
        </div>

        {/* Row 2: name + discount */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: textMain, margin: '0 0 4px' }}>
            {promo.name}
          </h3>
          <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: promo.type === 'flash_sale' ? '#dc2626' : '#059669' }}>
            {promo.discount_label}
          </p>
        </div>

        {/* Row 3: dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textMuted }}>
            <Calendar size={11} /> {t('start')} <span style={{ color: textMain, fontWeight: 700 }}>{fmtDate(promo.starts_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textMuted }}>
            <Clock size={11} /> {t('end')} <span style={{ color: textMain, fontWeight: 700 }}>{fmtDate(promo.ends_at)}</span>
          </div>
        </div>

        {/* Row 4: flash stock bar (flash sales only) */}
        {promo.type === 'flash_sale' && promo.flash_stock !== null && (
          <div style={{ background: subBg, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{t('flashStock')}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: textMain }}>
                {t('flashLeft', { left: promo.flash_stock_remaining ?? '?', total: promo.flash_stock })}
              </span>
            </div>
            <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg,#dc2626,#f97316)',
                width: `${promo.flash_stock > 0
                  ? Math.max(0, ((promo.flash_stock_remaining ?? 0) / promo.flash_stock) * 100)
                  : 0}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Row 5: products */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag size={11} color={textMuted} />
          <span style={{ fontSize: 11, color: textMuted }}>
            {t('productsCount', { count: promo.products_count })}
          </span>
          {promo.products.slice(0, 3).map(p => (
            <span key={p.id} style={{
              fontSize: 10, fontWeight: 700, color: textMuted,
              background: subBg, border: `1px solid ${border}`,
              padding: '2px 7px', borderRadius: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90,
            }}>
              {p.name}
            </span>
          ))}
          {promo.products_count > 3 && (
            <span style={{ fontSize: 10, color: textMuted }}>+{promo.products_count - 3}</span>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          disabled={promo.status === 'expired'}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px', borderRadius: 10,
            background: promo.status === 'expired' ? 'transparent' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${promo.status === 'expired' ? border : 'rgba(59,130,246,0.25)'}`,
            color: promo.status === 'expired' ? textMuted : '#3b82f6',
            fontWeight: 700, fontSize: 12, cursor: promo.status === 'expired' ? 'not-allowed' : 'pointer',
            opacity: promo.status === 'expired' ? 0.5 : 1,
          }}
        >
          <Edit2 size={12} /> {t('edit')}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <Trash2 size={12} /> {deleting ? '…' : t('delete')}
        </button>
      </div>
    </div>
  )
}