'use client'

/**
 * app/seller/orders/[id]/invoice/page.tsx
 *
 * Professional A4 invoice page.
 * Opens in a new tab. Supports:
 *   - window.print() → browser "Save as PDF" or direct print
 *   - Clean A4 layout optimized for paper and screen
 *
 * Architecture: pure frontend — no PDF library dependency.
 * The browser's native print engine renders pixel-perfect output.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ordersApi } from '@/lib/sellerApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantAttribute {
  slug: string
  label: string
  value: string
  color_hex: string | null
}

interface InvoiceItem {
  id: number
  product_name: string
  quantity: number
  unit_price: number
  total: number
  variant_id: number | null
  variant_label: string | null
  variant_attributes: VariantAttribute[]
  variant_image_url: string | null
}

interface InvoiceData {
  invoice_number: string
  order_number: string
  order_date: string
  status: string
  payment_method: string | null
  payment_status: string
  wilaya: string | null
  address: string | null
  phone: string | null
  seller: {
    business_name: string
    full_name: string
    phone: string | null
    wilaya: string | null
    city: string | null
    plan: string
  }
  customer: {
    name: string
  }
  items: InvoiceItem[]
  subtotal: number
  shipping_fee: number
  grand_total: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n) + ' TND'

const PAYMENT_LABELS: Record<string, string> = {
  cod:    'Cash on Delivery (COD)',
  card:   'Bank Card (Stripe)',
  d17:    'D17 Mobile Payment',
  wallet: 'Wallet',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  processing: 'Processing',
  completed:  'Completed',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const params = useParams()
  const id = Number(params?.id)

  const [data,    setData]    = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!id) return
    // Call the dedicated invoice endpoint
    fetch(
      `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '')}/api/seller/orders/${id}/invoice`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ct_auth_token') ?? ''}`,
        },
      }
    )
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => setData(json.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-trigger print dialog once data is loaded
  useEffect(() => {
    if (data) {
      // Small delay so the DOM finishes painting before print dialog opens
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [data])

  if (loading) return (
    <div style={styles.loadingWrap}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Preparing invoice…</p>
    </div>
  )

  if (error || !data) return (
    <div style={styles.loadingWrap}>
      <p style={{ color: '#dc2626', fontWeight: 700 }}>Failed to load invoice. Please close this tab and try again.</p>
    </div>
  )

  const subtotalBeforeShipping = data.subtotal
  const hasVariantItems = data.items.some(i => i.variant_id)

  return (
    <>
      {/* ── Global styles: screen + print ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Barlow', sans-serif;
          background: #f0f2f5;
          color: #1a1a2e;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── Screen: center the A4 sheet ── */
        .invoice-outer {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 16px 48px;
          gap: 16px;
        }

        /* ── Action bar (hidden when printing) ── */
        .action-bar {
          width: 210mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        /* ── The A4 sheet itself ── */
        .invoice-sheet {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        /* ── Print: remove screen chrome, reset page ── */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body { background: white; }

          .action-bar { display: none !important; }
          .invoice-outer { padding: 0; background: white; }
          .invoice-sheet {
            box-shadow: none;
            border-radius: 0;
            width: 100%;
            min-height: 100vh;
          }

          /* Prevent orphaned rows */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }

        .invoice-sheet { animation: fadeIn 0.3s ease both; }
      `}</style>

      <div className="invoice-outer">

        {/* ── Action bar (screen only) ── */}
        <div className="action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={`${typeof window !== 'undefined' ? window.location.origin : ''}/images/logo-chili.png`}
              alt="ChooseTounsi"
              style={{ height: 32, width: 'auto' }}
            />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 800, color: '#db142e',
              letterSpacing: '-0.01em',
            }}>
              Invoice Preview
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.print()}
              style={btnStyle('#db142e')}
            >
              🖨 Print / Save PDF
            </button>
            <button
              onClick={() => window.close()}
              style={btnStyle('#64748b')}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            A4 INVOICE SHEET
        ══════════════════════════════════════════════════════════════════ */}
        <div className="invoice-sheet">

          {/* ── Header band ── */}
          <div style={{
            background: 'linear-gradient(135deg, #db142e 0%, #a50f22 100%)',
            padding: '28px 40px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}>
            {/* Logo + brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img
                src={`${typeof window !== 'undefined' ? window.location.origin : ''}/images/logo-chili.png`}
                alt="ChooseTounsi"
                style={{
                  height: 56, width: 'auto',
                  filter: 'brightness(0) invert(1)',
                  opacity: 0.95,
                }}
              />
              <div>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 26, fontWeight: 800, color: '#fff',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  ChooseTounsi
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 3 }}>
                  Marketplace Tunisien · choosetounsi.tn
                </p>
              </div>
            </div>

            {/* Invoice title */}
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 32, fontWeight: 900, color: '#fff',
                letterSpacing: '0.05em', lineHeight: 1,
                textTransform: 'uppercase',
              }}>
                Facture
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 4 }}>
                {data.invoice_number}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {data.order_date}
              </p>
            </div>
          </div>

          {/* ── Green accent strip ── */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, #198f41, #12b34a)' }} />

          {/* ── Body ── */}
          <div style={{ padding: '32px 40px' }}>

            {/* ── Parties row: Seller + Customer ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              marginBottom: 28,
            }}>

              {/* Seller info */}
              <div style={partyCardStyle}>
                <p style={partyLabelStyle}>DE (Vendeur)</p>
                <p style={partyNameStyle}>{data.seller.business_name}</p>
                {data.seller.full_name !== data.seller.business_name && (
                  <p style={partyLineStyle}>{data.seller.full_name}</p>
                )}
                {(data.seller.city || data.seller.wilaya) && (
                  <p style={partyLineStyle}>
                    {[data.seller.city, data.seller.wilaya].filter(Boolean).join(', ')}
                  </p>
                )}
                {data.seller.phone && (
                  <p style={partyLineStyle}>📞 {data.seller.phone}</p>
                )}
                <p style={{
                  ...partyLineStyle,
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#db142e',
                  background: 'rgba(219,20,46,0.06)',
                  border: '1px solid rgba(219,20,46,0.15)',
                  borderRadius: 4,
                  padding: '2px 7px',
                  display: 'inline-block',
                }}>
                  Vendeur ChooseTounsi
                </p>
              </div>

              {/* Customer info — name only (privacy) */}
              <div style={partyCardStyle}>
                <p style={partyLabelStyle}>À (Client)</p>
                <p style={partyNameStyle}>{data.customer.name}</p>
                <p style={{ ...partyLineStyle, fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 }}>
                  Informations confidentielles
                </p>
              </div>
            </div>

            {/* ── Order meta strip ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: '#e2e8f0',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 28,
            }}>
              {[
                { label: 'N° Commande',  value: data.order_number },
                { label: 'Date',         value: data.order_date },
                { label: 'Paiement',     value: PAYMENT_LABELS[data.payment_method ?? ''] ?? data.payment_method ?? '—' },
                { label: 'Statut',       value: STATUS_LABELS[data.status] ?? data.status },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Items table ── */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: 0,
              fontSize: 12,
            }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  <th style={{ ...thStyle, width: hasVariantItems ? 48 : 0, padding: hasVariantItems ? '10px 8px' : 0 }} />
                  <th style={{ ...thStyle, textAlign: 'left' }}>Produit</th>
                  <th style={{ ...thStyle, width: 60 }}>Qté</th>
                  <th style={{ ...thStyle, width: 110, textAlign: 'right' }}>Prix unitaire</th>
                  <th style={{ ...thStyle, width: 110, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={item.id} style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    {/* Variant image */}
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      {item.variant_image_url ? (
                        <img
                          src={item.variant_image_url}
                          alt={item.product_name}
                          style={{
                            width: 40, height: 40,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 6,
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          📦
                        </div>
                      )}
                    </td>

                    {/* Product name + variant */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 12, marginBottom: 3 }}>
                        {item.product_name}
                      </p>
                      {item.variant_attributes.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {/* Group colors together, show others individually */}
                          {(() => {
                            const colors = item.variant_attributes.filter(a => a.slug === 'color')
                            const others = item.variant_attributes.filter(a => a.slug !== 'color')

                            return (
                              <>
                                {/* Colors as swatches */}
                                {colors.length > 0 && (
                                  <span style={attrPillStyle}>
                                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginRight: 4 }}>
                                      Couleur
                                    </span>
                                    {colors.map((c, ci) =>
                                      c.color_hex ? (
                                        <span
                                          key={ci}
                                          title={c.value}
                                          style={{
                                            display: 'inline-block',
                                            width: 11, height: 11,
                                            borderRadius: '50%',
                                            background: c.color_hex,
                                            border: '1px solid rgba(0,0,0,0.15)',
                                            marginRight: 2,
                                            verticalAlign: 'middle',
                                          }}
                                        />
                                      ) : (
                                        <span key={ci} style={{ fontSize: 10, marginRight: 2 }}>{c.value}</span>
                                      )
                                    )}
                                    <span style={{ fontSize: 10, color: '#475569' }}>
                                      {colors.map(c => c.value).join(', ')}
                                    </span>
                                  </span>
                                )}

                                {/* Other attributes */}
                                {others.map((attr, ai) => (
                                  <span key={ai} style={attrPillStyle}>
                                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginRight: 4 }}>
                                      {attr.label}
                                    </span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b' }}>
                                      {attr.value}
                                    </span>
                                  </span>
                                ))}
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Qty */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#475569' }}>
                      {item.quantity}
                    </td>

                    {/* Unit price */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle', color: '#475569', fontWeight: 600 }}>
                      {fmt(item.unit_price)}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 800, color: '#1e293b' }}>
                      {fmt(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Totals block ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 0,
            }}>
              <div style={{
                width: 280,
                border: '1px solid #e2e8f0',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
              }}>
                <div style={totalRowStyle(false)}>
                  <span>Sous-total</span>
                  <span>{fmt(data.subtotal)}</span>
                </div>
                <div style={totalRowStyle(false)}>
                  <span>Frais de livraison</span>
                  <span>{fmt(data.shipping_fee)}</span>
                </div>
                <div style={totalRowStyle(true)}>
                  <span>TOTAL</span>
                  <span>{fmt(data.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* ── Footer note ── */}
            <div style={{
              marginTop: 36,
              paddingTop: 20,
              borderTop: '2px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
                  Merci pour votre commande sur ChooseTounsi !
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8' }}>
                  Pour toute question, contactez choosetounsi.tn
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>
                  Document généré le {new Date().toLocaleDateString('fr-TN')}
                </p>
                <p style={{ fontSize: 10, color: '#e2e8f0' }}>
                  {data.invoice_number}
                </p>
              </div>
            </div>

          </div>

          {/* ── Bottom accent bar ── */}
          <div style={{ height: 6, background: 'linear-gradient(90deg, #db142e 0%, #198f41 100%)' }} />
        </div>

      </div>
    </>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const styles = {
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Barlow', sans-serif",
    gap: 16,
    background: '#f0f2f5',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTopColor: '#db142e',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
  },
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '9px 20px',
    background: bg,
    color: '#fff',
    fontFamily: "'Barlow', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }
}

const partyCardStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '14px 16px',
}

const partyLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#94a3b8',
  marginBottom: 6,
}

const partyNameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: '#1e293b',
  marginBottom: 4,
}

const partyLineStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#475569',
  marginBottom: 2,
  fontWeight: 500,
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 9,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(255,255,255,0.8)',
  textAlign: 'center',
}

const attrPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  padding: '2px 7px',
  gap: 2,
}

function totalRowStyle(isTotal: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTotal ? '12px 16px' : '8px 16px',
    background: isTotal ? '#1e293b' : '#f8fafc',
    color: isTotal ? '#fff' : '#475569',
    fontSize: isTotal ? 14 : 12,
    fontWeight: isTotal ? 900 : 600,
    borderTop: isTotal ? '2px solid #db142e' : '1px solid #e2e8f0',
  }
}