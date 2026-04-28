// app/components/promotions/FlashSalesSection.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { publicPromotionsApi } from '@/lib/promotionsApi'
import CountdownTimer from './CountdownTimer'
import PromotionBadge from './PromotionBadge'

const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '')

const money = (n: number) => `${Number(n).toFixed(2)} DT`

export default function FlashSalesSection() {
  const [flashSales, setFlashSales] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    publicPromotionsApi.flashSales()
      .then(res => setFlashSales(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Don't render the section at all when there are no flash sales
  if (!loading && flashSales.length === 0) return null

  return (
    <section style={{
      background: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
      margin: '0 0 0',
      padding: '24px 32px',
    }}>
      <div style={{ maxWidth: 1520, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                Flash Sales
              </h2>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500 }}>
                Limited time · Limited stock
              </p>
            </div>
          </div>
        </div>

        {/* Flash sale groups */}
        {loading ? (
          // Skeleton
          <div style={{ display: 'flex', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                width: 160, background: 'rgba(255,255,255,0.1)',
                borderRadius: 10, height: 220,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          flashSales.map(sale => (
            <div key={sale.id} style={{ marginBottom: 24 }}>
              {/* Sale header with countdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
                  {sale.name}
                </span>
                <span style={{
                  fontSize: 11, background: 'rgba(255,255,255,0.15)',
                  color: '#fff', padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                }}>
                  {sale.discount_label}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <CountdownTimer endsAt={sale.ends_at} />
                </div>
              </div>

              {/* Product strip */}
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {sale.products.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    style={{
                      width: 150, flexShrink: 0, borderRadius: 10,
                      background: '#fff', overflow: 'hidden',
                      textDecoration: 'none', display: 'flex', flexDirection: 'column',
                      border: '2px solid rgba(255,255,255,0.2)',
                      transition: 'transform 0.15s',
                    }}
                  >
                    {/* Image */}
                    <div style={{ width: '100%', aspectRatio: '1', background: '#f5f5f5', position: 'relative' }}>
                      {p.primary_image_url && (
                        <img
                          src={p.primary_image_url.startsWith('http')
                            ? p.primary_image_url
                            : `${ORIGIN}${p.primary_image_url}`}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                      {/* Stock remaining badge */}
                      {sale.flash_stock_remaining !== null && (
                        <div style={{
                          position: 'absolute', bottom: 4, left: 4, right: 4,
                          background: 'rgba(0,0,0,0.55)', borderRadius: 4,
                          padding: '2px 5px',
                        }}>
                          <div style={{
                            height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 999, overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 999, background: '#fbbf24',
                              width: `${Math.min(100, (sale.flash_stock_remaining / (sale.flash_stock ?? 100)) * 100)}%`,
                            }} />
                          </div>
                          <p style={{ fontSize: 8, color: '#fff', margin: '2px 0 0', fontWeight: 700, textAlign: 'center' }}>
                            {sale.flash_stock_remaining} left
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '7px 9px 9px' }}>
                      <p style={{
                        fontSize: 11, fontWeight: 600, color: '#1f2937',
                        lineHeight: 1.35, margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.name}</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', margin: 0 }}>
                        {money(p.effective_price)}
                      </p>
                      {p.original_price !== p.effective_price && (
                        <p style={{ fontSize: 9, color: '#bbb', textDecoration: 'line-through', margin: '1px 0 0' }}>
                          {money(p.original_price)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </section>
  )
}