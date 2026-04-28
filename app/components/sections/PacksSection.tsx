'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package2, TrendingDown, Tag, ArrowRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface PackItem {
  id: number
  product: { name: string; primary_image_url: string | null } | null
  quantity: number
}

interface Pack {
  id: number
  name: string
  slug: string
  short_description: string | null
  image_url: string | null
  pack_price: number
  original_price: number
  savings: number
  items_count: number
  items: PackItem[]
  seller: { name: string } | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n) + ' TND'
}

function PackCard({ pack }: { pack: Pack }) {
  const [imgErr, setImgErr] = useState(false)
  const savingsPct = pack.original_price > 0
    ? Math.round((pack.savings / pack.original_price) * 100)
    : 0

  // Collect up to 4 product thumbnails from items
  const thumbs = pack.items
    .filter(i => i.product?.primary_image_url)
    .slice(0, 4)

  return (
    <Link
      href={`/deals/${pack.slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: 18,
        border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        cursor: 'pointer',
      }}
      className="pack-card-home"
    >
      {/* Cover image or product grid */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#f8fafc',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {pack.image_url && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pack.image_url}
            alt={pack.name}
            onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : thumbs.length >= 2 ? (
          /* 2x2 product thumbnail grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            width: '100%', height: '100%', gap: 2,
          }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ background: '#f1f5f9', overflow: 'hidden', position: 'relative' }}>
                {thumbs[i]?.product?.primary_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[i].product!.primary_image_url!}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package2 size={40} style={{ color: '#d1d5db' }} />
          </div>
        )}

        {/* Savings badge top-left */}
        {savingsPct > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#db142e', color: '#fff',
            fontSize: 11, fontWeight: 800,
            padding: '4px 9px', borderRadius: 999,
            boxShadow: '0 2px 8px rgba(219,20,46,0.35)',
          }}>
            <TrendingDown size={11} />
            Save {savingsPct}%
          </div>
        )}

        {/* Items count badge top-right */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          backdropFilter: 'blur(4px)',
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 999,
        }}>
          <Tag size={9} />
          {pack.items_count} items
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>

        {/* Pack name */}
        <h3 style={{
          fontSize: 14, fontWeight: 800, color: '#0f172a',
          margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {pack.name}
        </h3>

        {/* Short description */}
        {pack.short_description && (
          <p style={{
            fontSize: 12, color: '#64748b', margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          }}>
            {pack.short_description}
          </p>
        )}

        {/* Seller */}
        {pack.seller && (
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
            by <strong style={{ color: '#64748b' }}>{pack.seller.name}</strong>
          </p>
        )}

        {/* Pricing */}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#db142e' }}>
              {fmt(pack.pack_price)}
            </span>
            {pack.original_price > pack.pack_price && (
              <span style={{
                fontSize: 12, color: '#94a3b8',
                textDecoration: 'line-through', fontWeight: 500,
              }}>
                {fmt(pack.original_price)}
              </span>
            )}
          </div>
          {pack.savings > 0 && (
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#10b981',
              margin: '3px 0 0',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <TrendingDown size={11} />
              You save {fmt(pack.savings)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function PacksSection() {
  const [packs,   setPacks]   = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/packs?per_page=6`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(json => setPacks(json.data?.data ?? []))
      .catch(() => setPacks([]))
      .finally(() => setLoading(false))
  }, [])

  // Don't render the section at all if no packs exist
  if (!loading && packs.length === 0) return null

  return (
    <section style={{ background: '#f0f2f5', padding: '48px 0' }}>
      <style>{`
        .pack-card-home:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 44px rgba(0,0,0,0.12);
          border-color: #db142e !important;
        }
        @keyframes packShimmer {
          0% { background-position: -600px 0 }
          100% { background-position: 600px 0 }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 28,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(219,20,46,0.1)',
                border: '1px solid rgba(219,20,46,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#db142e',
              }}>
                <Package2 size={18} />
              </div>
              <h2 style={{
                fontSize: 'clamp(1.2rem,2.5vw,1.65rem)',
                fontWeight: 800, color: '#111',
                letterSpacing: '-0.02em', margin: 0,
                fontFamily: "'Barlow', sans-serif",
              }}>
                Bundle Deals 🎁
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 500 }}>
              Save more when you buy together
            </p>
          </div>
          <Link
            href="/deals"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700,
              color: '#db142e', textDecoration: 'none',
              background: 'rgba(219,20,46,0.07)',
              border: '1px solid rgba(219,20,46,0.2)',
              padding: '8px 16px', borderRadius: 999,
              transition: 'background 0.15s',
            }}
          >
            View All Deals <ArrowRight size={13} />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                borderRadius: 18, overflow: 'hidden',
                background: '#fff', border: '1.5px solid #e5e7eb',
              }}>
                <div style={{
                  width: '100%', aspectRatio: '16/9',
                  background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)',
                  backgroundSize: '600px 100%',
                  animation: 'packShimmer 1.3s infinite linear',
                }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 14, borderRadius: 6, background: '#e5e7eb', width: '80%' }} />
                  <div style={{ height: 11, borderRadius: 6, background: '#f3f4f6', width: '60%' }} />
                  <div style={{ height: 20, borderRadius: 6, background: '#fee2e2', width: '50%', marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {packs.map(pack => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}