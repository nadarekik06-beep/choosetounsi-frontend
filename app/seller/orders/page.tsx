'use client'

import { useEffect, useState, useCallback } from 'react';
import { ordersApi } from '@/lib/sellerApi';
import {
  Search, Eye, ChevronLeft, ChevronRight, X, Loader2,
  ShoppingBag, AlertCircle, User, MapPin, Package,
  Hash, Calendar, Tag,
} from 'lucide-react';
import { useTheme } from '../SellerShell';
import type { Order, OrderDetail, OrderItem, VariantAttribute, PaginatedResponse, OrderCommissionSummary } from '@/types/seller';
import { useTranslations } from 'next-intl';
import { useFormat } from '@/lib/i18n/useFormat';
import { useStatusLabel } from '@/lib/i18n/useStatusLabel';
import { useWilayaLabel } from '@/lib/i18n/wilayas';

/** 3-decimal DT amounts, as on invoices */
function useDt() {
  const { price } = useFormat();
  return {
    dt:   (n: number | string | null | undefined) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    bare: (n: number | string | null | undefined) => price(n, { minimumFractionDigits: 3, maximumFractionDigits: 3, bare: true }),
  };
}

// ─── Status colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:          '#f59e0b',
  confirmed:        '#3b82f6',
  completed:        '#10b981',
  delivered:        '#14b8a6',
  cancelled:        '#ef4444',
  refunded:         '#a855f7',
  out_for_delivery: '#8b5cf6',
};

function StatusBadge({ status, dark }: { status: string; dark: boolean }) {
  const label = useStatusLabel();
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      textTransform: 'capitalize',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label(status)}
    </span>
  );
}

const PAYMENT_COLORS: Record<string, string> = {
  paid:     '#10b981',
  unpaid:   '#f59e0b',
  refunded: '#a855f7',
};

function PaymentBadge({ status }: { status: string }) {
  const label = useStatusLabel('paymentStatus');
  const color = PAYMENT_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', fontSize: 10, fontWeight: 800,
      padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize',
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{label(status)}</span>
  );
}

function MethodBadge({ method }: { method: string | null }) {
  const t = useTranslations('seller.orders.methods');
  if (!method) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex', fontSize: 10, fontWeight: 800,
      padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase',
      background: 'rgba(99,102,241,0.1)', color: '#6366f1',
      border: '1px solid rgba(99,102,241,0.25)',
    }}>
      {t.has(method) ? t(method) : method}
    </span>
  );
}

// ─── Variant pill ─────────────────────────────────────────────────────────────

function VariantPill({ attr }: { attr: VariantAttribute }) {
  if (attr.slug === 'color' && attr.color_hex) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
          background: attr.color_hex, border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{attr.value}</span>
      </span>
    );
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: '#6366f1',
      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
      padding: '2px 7px', borderRadius: 5,
    }}>
      {attr.value}
    </span>
  );
}

// ─── Commission ───────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = { free: '#198f41', red: '#db142e', black: '#f59e0b' };

function CommissionItemBadge({ item }: { item: OrderItem; dark: boolean }) {
  const t = useTranslations('seller.orders');
  const { dt } = useDt();
  const { number } = useFormat();
  if (!item.has_commission || item.commission_percentage === null) return null;
  const planColor = PLAN_COLORS[item.plan_used ?? 'free'] ?? '#198f41';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', padding: '1px 6px', borderRadius: 4 }}>
          {t('fee', { pct: number(item.commission_percentage) })}
        </span>
        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
          −{dt(item.commission_amount)}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: planColor, background: `${planColor}10`, border: `1px solid ${planColor}25`, padding: '1px 6px', borderRadius: 4 }}>
          {t(`plan.${item.plan_used === 'red' || item.plan_used === 'black' ? item.plan_used : 'free'}`)}
        </span>
      </div>
      {Number(item.discount_amount ?? 0) > 0 && (
        <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
          {t('couponLine', { discount: dt(item.discount_amount), net: dt(item.net_total) })}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>{t('youReceive')}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#10b981' }}>
          {dt(item.seller_amount)}
        </span>
      </div>
    </div>
  );
}

function CommissionSummaryCard({ commission, dark, border, bgSub }: {
  commission: OrderCommissionSummary; dark: boolean; border: string; bgSub: string;
}) {
  const t = useTranslations('seller.orders');
  const { bare, dt } = useDt();
  const { currency } = useFormat();
  if (!commission.has_commission) return null;
  const discount = Number(commission.total_discount ?? 0);
  const net      = Number(commission.total_net ?? commission.total_gross);
  // Coupon is seller-funded; the platform fee is charged on the price after it.
  const columns = [
    { label: t('summary.gross'),    value: bare(commission.total_gross),             color: dark ? '#93c5fd' : '#1e40af', bg: dark ? 'rgba(59,130,246,0.08)' : '#eff6ff', bd: dark ? 'rgba(59,130,246,0.15)' : '#bfdbfe', note: discount > 0 ? t('summary.beforeCoupon') : t('summary.customerPaid') },
    ...(discount > 0 ? [
      { label: t('summary.coupon'), value: '−' + bare(discount),                    color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', bd: 'rgba(245,158,11,0.18)', note: t('summary.customerPaidAmount', { amount: dt(net) }) },
    ] : []),
    { label: t('summary.fee'),      value: bare(commission.total_commission_amount), color: '#ef4444', bg: 'rgba(239,68,68,0.06)', bd: 'rgba(239,68,68,0.18)', note: discount > 0 ? t('summary.on', { amount: dt(net) }) : t('summary.commission') },
    { label: t('summary.receive'),  value: bare(commission.total_seller_net),        color: '#10b981', bg: 'rgba(16,185,129,0.06)', bd: 'rgba(16,185,129,0.18)', note: t('summary.netAfterFees') },
  ];
  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: dark ? 'rgba(255,255,255,0.7)' : '#374151' }}>{t('summary.title')}</span>
        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(219,20,46,0.1)', color: '#db142e', border: '1px solid rgba(219,20,46,0.2)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' as const }}>{t('summary.badge')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 8 }}>
        {columns.map(col => (
          <div key={col.label} style={{ background: col.bg, border: `1px solid ${col.bd}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center' as const }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: col.color, margin: '0 0 5px', opacity: 0.8, textTransform: 'uppercase' as const }}>{col.label}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: col.color, margin: '0 0 3px' }}>{col.value}</p>
            <p style={{ fontSize: 9, color: col.color, margin: 0, opacity: 0.65 }}>{currency} · {col.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order item card ──────────────────────────────────────────────────────────

function OrderItemCard({ item, dark, border, textMain, textMuted, bgSub }: {
  item: OrderItem; dark: boolean; border: string; textMain: string; textMuted: string; bgSub: string;
}) {
  const t = useTranslations('seller.orders');
  const { dt, bare } = useDt();
  const { currency } = useFormat();
  const hasVariant = !!item.variant_id;
  const hasImage   = !!item.variant_image_url;
  const hasAttrs   = item.variant_attributes && item.variant_attributes.length > 0;

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${border}`, alignItems: 'flex-start',
      background: item.item_status === 'returned' ? 'rgba(219,20,46,0.04)' : item.item_status === 'exchanged' ? 'rgba(245,158,11,0.04)' : 'transparent',
      borderInlineStart: item.item_status === 'returned' ? '3px solid #db142e' : item.item_status === 'exchanged' ? '3px solid #f59e0b' : 'none',
    }}>
      <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${border}`, background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {hasImage
          ? <img src={item.variant_image_url!} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          : <Package size={24} style={{ color: dark ? 'rgba(255,255,255,0.15)' : '#cbd5e1' }} />
        }
        {hasVariant && (
          <div style={{ position: 'absolute', bottom: 4, insetInlineEnd: 4, width: 16, height: 16, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={8} color="#fff" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <p style={{ fontWeight: 800, color: item.item_status ? (dark ? '#6b7280' : '#94a3b8') : textMain, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: item.item_status ? 'line-through' : 'none' }}>
            {item.product_name}
          </p>
          {item.item_status === 'returned' && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(219,20,46,0.15)', color: '#db142e', border: '1px solid rgba(219,20,46,0.35)' }}>{t('returned')}</span>}
          {item.item_status === 'exchanged' && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>{t('exchanged')}</span>}
        </div>

        {hasVariant && (
          <div style={{ marginBottom: 8 }}>
            {item.variant_label && !hasAttrs && <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px', fontStyle: 'italic' }}>{item.variant_label}</p>}
            {hasAttrs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {item.variant_attributes.map((attr, i) => (
                  <div key={`${attr.slug}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted, minWidth: 36 }}>{attr.label}</span>
                    <VariantPill attr={attr} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasVariant && <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px' }}>{t('simpleProduct')}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.5)' : '#64748b', background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 5 }}>
            {t('qty', { count: item.quantity })}
          </span>
          <span style={{ fontSize: 11, color: textMuted }}>{t('perUnit', { price: dt(item.unit_price) })}</span>
        </div>
        <CommissionItemBadge item={item} dark={dark} />
      </div>

      <div style={{ textAlign: 'end', flexShrink: 0 }}>
        <p style={{ fontWeight: 900, color: '#3b82f6', fontSize: 14, margin: 0 }}>{bare(item.total)}</p>
        <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, margin: '2px 0 0', textTransform: 'uppercase' }}>{currency}</p>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose, onUpdated, dark }: {
  orderId: number; onClose: () => void; onUpdated: () => void; dark: boolean;
}) {
  const t = useTranslations('seller.orders');
  const { dt } = useDt();
  const { date } = useFormat();
  const wilaya = useWilayaLabel();
  const [detail,         setDetail]         = useState<OrderDetail | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error,          setError]          = useState('');
  const [successMsg,     setSuccessMsg]     = useState('');

  const bg        = dark ? '#161b27' : '#ffffff';
  const bgSub     = dark ? '#1e2535' : '#f8fafc';
  const border    = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textMain  = dark ? '#fff'    : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#64748b';

  useEffect(() => {
    ordersApi.getOne(orderId)
      .then(res => setDetail(res.data))
      .catch(() => setError(t('loadFailed')))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleMarkCompleted = async () => {
    setUpdatingStatus(true);
    setError('');
    try {
      await ordersApi.updateStatus(orderId, 'completed');
      setSuccessMsg(t('markedCompleted'));
      const res = await ordersApi.getOne(orderId);
      setDetail(res.data);
      onUpdated();
    } catch {
      setError(t('updateFailed'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: bg, borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', border: `1px solid ${border}` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: textMain, margin: 0 }}>{t('details')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => window.open(`/invoice/${orderId}`, '_blank')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'linear-gradient(135deg,#db142e,#a50f22)', color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              {t('printInvoice')}
            </button>
            <button onClick={onClose} aria-label={t('close')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 6, borderRadius: 10 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#3b82f6' }} />
            </div>
          ) : error && !detail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(219,20,46,0.1)', border: '1px solid rgba(219,20,46,0.2)', borderRadius: 12, padding: '12px 16px', color: '#db142e', fontSize: 13 }}>
              <AlertCircle size={15} />{error}
            </div>
          ) : detail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Feedback */}
              {successMsg && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                  ✓ {successMsg}
                </div>
              )}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: Hash,     label: t('orderNumber'), value: detail.order.order_number },
                  { icon: Calendar, label: t('date'),        value: date(detail.order.created_at, 'medium') },
                  { icon: User,     label: t('customer'),    value: detail.order.customer?.name ?? '—' },
                  { icon: MapPin,   label: t('wilaya'),      value: (detail.order.wilaya ?? detail.order.customer?.state) ? wilaya((detail.order.wilaya ?? detail.order.customer?.state) as string) : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: bgSub, borderRadius: 12, padding: '12px 14px', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: textMuted, marginBottom: 6 }}>
                      <Icon size={9} />{label}
                    </div>
                    <p style={{ fontWeight: 800, color: textMain, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Status badges */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: t('orderStatus'),   node: <StatusBadge status={detail.order.status} dark={dark} /> },
                  { label: t('paymentStatus'), node: <PaymentBadge status={detail.order.payment_status} /> },
                  { label: t('paymentMethod'), node: <MethodBadge method={detail.order.payment_method ?? null} /> },
                ].map(({ label, node }) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: textMuted, marginBottom: 6 }}>{label}</p>
                    {node}
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Package size={14} color="#3b82f6" />
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: textMain, margin: 0 }}>{t('yourItems')}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', padding: '1px 7px', borderRadius: 4 }}>
                    {t('itemCount', { count: detail.items.length })}
                  </span>
                </div>
                <div style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  {detail.items.map(item => (
                    <OrderItemCard key={item.id} item={item} dark={dark} border={border} textMain={textMain} textMuted={textMuted} bgSub={bgSub} />
                  ))}
                  {Number(detail.discount_amount ?? 0) > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textMuted }}>{t('subtotal')}</span>
                        <span style={{ fontWeight: 800, color: textMain, fontSize: 13 }}>{dt(detail.seller_subtotal)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                          {t('coupon')}{detail.coupon_code ? ` (${detail.coupon_code})` : ''}
                          {detail.coupon_type === 'percentage' && detail.coupon_value ? ` · ${Number(detail.coupon_value)}%` : ''}
                        </span>
                        <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 13 }}>−{dt(detail.discount_amount)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: dark ? 'rgba(59,130,246,0.08)' : '#eff6ff', borderTop: `1px solid ${border}` }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: dark ? '#93c5fd' : '#1e40af' }}>{Number(detail.discount_amount ?? 0) > 0 ? t('totalAfterCoupon') : t('yourSubtotal')}</span>
                    <span style={{ fontWeight: 900, color: '#3b82f6', fontSize: 15 }}>{dt(detail.seller_total ?? detail.seller_subtotal)}</span>
                  </div>
                </div>

                {detail.commission?.has_commission && (
                  <div style={{ background: bgSub, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginTop: 2 }}>
                    <CommissionSummaryCard commission={detail.commission} dark={dark} border={border} bgSub={bgSub} />
                  </div>
                )}
              </div>

              {/* ── Seller Action Block ── */}

              {/* PENDING — waiting for admin */}
              {detail.order.status === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: '14px 18px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', margin: 0 }}>{t('waitingTitle')}</p>
                    <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', margin: '2px 0 0' }}>{t('waitingBody')}</p>
                  </div>
                </div>
              )}

              {/* CONFIRMED — ready to prepare */}
              {detail.order.status === 'confirmed' && (
                <div style={{ background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color="#10b981" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#10b981', margin: 0 }}>{t('readyTitle')}</p>
                      <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', margin: '2px 0 0' }}>
                        {t('readyBody')}
                      </p>
                    </div>
                  </div>

                  {[t('steps.stock'), t('steps.pack'), t('steps.invoice')].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.6)' : '#374151' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#10b981' }}>
                        {i + 1}
                      </div>
                      {step}
                    </div>
                  ))}

                  <button
                    onClick={handleMarkCompleted}
                    disabled={updatingStatus}
                    style={{
                      width: '100%', marginTop: 6, padding: '14px 20px', borderRadius: 12, border: 'none',
                      background: updatingStatus ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#10b981,#059669)',
                      color: '#fff', fontWeight: 800, fontSize: 14,
                      cursor: updatingStatus ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!updatingStatus) e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                  >
                    {updatingStatus
                      ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <span style={{ fontSize: 16 }}>✅</span>
                    }
                    {updatingStatus ? t('updating') : t('markCompleted')}
                  </button>
                </div>
              )}

              {/* COMPLETED — waiting for pickup */}
              {detail.order.status === 'completed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '14px 18px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#10b981', margin: 0 }}>{t('packedTitle')}</p>
                    <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', margin: '2px 0 0' }}>{t('packedBody')}</p>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrdersPage() {
  const { dark } = useTheme();
  const t = useTranslations('seller.orders');
  const { dt } = useDt();
  const { date } = useFormat();
  const statusLabel  = useStatusLabel();
  const paymentLabel = useStatusLabel('paymentStatus');
  const wilaya = useWilayaLabel();
  const [data,          setData]          = useState<PaginatedResponse<Order> | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [page,          setPage]          = useState(1);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);

  const empty: PaginatedResponse<Order> = { data: [], current_page: 1, last_page: 1, per_page: 12, total: 0, from: 0, to: 0 };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getAll({
        page, per_page: 12,
        ...(search        && { search }),
        ...(filterStatus  && { status: filterStatus }),
        ...(filterPayment && { payment_status: filterPayment }),
      });
      const payload = (res as any)?.data ?? res;
      setData(Array.isArray(payload?.data) ? payload : empty);
    } catch { setData(empty); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterPayment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardBg    = dark ? '#161b27' : '#ffffff';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#ffffff' : '#0f172a';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : '#94a3b8';
  const inputBg   = dark ? '#0d1117' : '#f8fafc';
  const theadBg   = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const rowHover  = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${border}`, borderRadius: 10, padding: '8px 12px',
    fontSize: 13, fontWeight: 500, background: inputBg, color: textMain,
    outline: 'none', transition: 'border 0.15s ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .order-row:hover td { background: ${rowHover}!important; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .eye-btn:hover { background: ${dark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)'}!important; color: #3b82f6!important }
        @keyframes confirmedPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{t('title')}</h1>
        <p style={{ fontSize: 11, color: textMuted, margin: 0, fontWeight: 500 }}>{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div style={{ background: cardBg, borderRadius: 16, padding: 16, border: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('searchPlaceholder')} style={{ ...inputStyle, width: '100%', paddingInlineStart: 32 }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={inputStyle}>
          <option value="">{t('allStatuses')}</option>
          {['pending', 'confirmed', 'completed', 'delivered', 'cancelled'].map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1); }} style={inputStyle}>
          <option value="">{t('allPayments')}</option>
          {['unpaid', 'paid', 'refunded'].map(s => (
            <option key={s} value={s}>{paymentLabel(s)}</option>
          ))}
        </select>
        {data && <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, marginInlineStart: 'auto' }}>{t('count', { count: data.total })}</span>}
      </div>

      {/* Table */}
      <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: theadBg }}>
                  {(['order', 'customer', 'wilaya', 'status', 'payment', 'method', 'amount', 'date', ''] as const).map((h, i) => (
                    <th key={h + i} style={{ padding: '10px 20px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: textMuted, textAlign: h === 'amount' ? 'end' : h === '' ? 'center' : 'start' }}>{h ? t(`cols.${h}`) : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.map(order => (
                  <tr
                    key={order.id}
                    className="order-row"
                    style={{
                      borderTop: `1px solid ${border}`,
                      borderInlineStart: order.status === 'confirmed' ? '3px solid #3b82f6' : '3px solid transparent',
                      background: order.status === 'confirmed' ? (dark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)') : undefined,
                    }}
                  >
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ShoppingBag size={13} color="#3b82f6" />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 11, background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', color: textMain, padding: '2px 7px', borderRadius: 6 }}>
                          {order.order_number}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <p style={{ fontWeight: 700, color: textMain, margin: 0, fontSize: 12 }}>{order.user?.name ?? t('customerFallback', { id: order.user_id })}</p>
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 12, fontWeight: 500, color: textMuted }}>{order.wilaya ? wilaya(order.wilaya) : '—'}</td>
                    <td style={{ padding: '13px 20px' }}><StatusBadge status={order.status} dark={dark} /></td>
                    <td style={{ padding: '13px 20px' }}><PaymentBadge status={order.payment_status} /></td>
                    <td style={{ padding: '13px 20px' }}><MethodBadge method={order.payment_method} /></td>
                    <td style={{ padding: '13px 20px', textAlign: 'end', fontWeight: 900, color: textMain, fontSize: 12 }}>{dt(order.total_amount)}</td>
                    <td style={{ padding: '13px 20px', fontSize: 11, color: textMuted, fontWeight: 500 }}>{date(order.created_at, 'short')}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {order.status === 'confirmed' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: dark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', whiteSpace: 'nowrap', animation: 'confirmedPulse 2s ease-in-out infinite' }}>
                            {t('prepareNow')}
                          </span>
                        )}
                        <button onClick={() => setSelectedId(order.id)} aria-label={t('view')} title={t('view')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: textMuted }} className="eye-btn">
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '56px 20px', textAlign: 'center' }}>
                      <ShoppingBag size={28} style={{ margin: '0 auto 10px', display: 'block', color: textMuted, opacity: 0.4 }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: textMuted, margin: '0 0 4px' }}>{t('empty')}</p>
                      <p style={{ fontSize: 11, color: textMuted, opacity: 0.6, margin: 0 }}>{t('emptyHint')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && data.last_page > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>{t('showing', { from: data.from ?? 0, to: data.to ?? 0, total: data.total })}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, color: textMain, padding: '0 4px' }}>{data.current_page}/{data.last_page}</span>
              <button onClick={() => setPage(p => Math.min(data.last_page, p + 1))} disabled={page === data.last_page} style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textMuted, opacity: page === data.last_page ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <OrderDetailModal orderId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchData} dark={dark} />
      )}
    </div>
  );
}