'use client'

import { useEffect, useState } from 'react'
import { packsApi } from '@/lib/sellerApi'
import { useTheme } from '../layout'
import {
  Package2, Plus, Edit2, Trash2, AlertCircle,
  RefreshCw, Tag, TrendingDown, CheckCircle, Clock
} from 'lucide-react'
import PackModal from '@/app/seller/packs/PackModal'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3, maximumFractionDigits: 3,
  }).format(n) + ' TND'
}

export default function PacksPage() {
  const { dark } = useTheme()
  const [packs,   setPacks]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [modal,   setModal]   = useState<{ open: boolean; pack: any | null }>({
    open: false, pack: null,
  })
  const [deleting, setDeleting] = useState<number | null>(null)

  const bg        = dark ? '#0D1117' : '#f0f2f5'
  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff'  : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888'

  const load = () => {
    setLoading(true); setError(false)
    packsApi.getAll({ per_page: 20 })
      .then(res => setPacks(res.data?.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pack?')) return
    setDeleting(id)
    try {
      await packsApi.delete(id)
      setPacks(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('Failed to delete pack.')
    } finally {
      setDeleting(null)
    }
  }

  const openEdit = async (pack: any) => {
    // Load full pack details (with items)
    try {
      const res = await packsApi.getOne(pack.id)
      setModal({ open: true, pack: res.data })
    } catch {
      setModal({ open: true, pack })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textMain, margin: 0 }}>Packs</h1>
          <p style={{ fontSize: 12, color: textMuted, margin: '3px 0 0' }}>
            Bundle your products and offer savings to customers
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, pack: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: 'linear-gradient(135deg,#db142e,#a00f22)',
            color: '#fff', fontWeight: 800, fontSize: 13,
            borderRadius: 12, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(219,20,46,0.35)',
          }}
        >
          <Plus size={15} /> Create Pack
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textMuted }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} color="#db142e" style={{ margin: '0 auto 10px', display: 'block' }} />
          <p style={{ color: textMuted, fontSize: 13 }}>Failed to load packs.</p>
          <button onClick={load} style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#db142e', color: '#fff',
            fontWeight: 700, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : packs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: cardBg, borderRadius: 18, border: `1px solid ${border}`,
        }}>
          <Package2 size={40} style={{ color: textMuted, opacity: 0.3, margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontWeight: 800, color: textMain, fontSize: 15, margin: '0 0 6px' }}>
            No packs yet
          </p>
          <p style={{ fontSize: 13, color: textMuted, margin: '0 0 20px' }}>
            Create your first bundle to attract more buyers.
          </p>
          <button
            onClick={() => setModal({ open: true, pack: null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              background: 'linear-gradient(135deg,#db142e,#a00f22)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              borderRadius: 12, border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Create Pack
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {packs.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              dark={dark}
              onEdit={() => openEdit(pack)}
              onDelete={() => handleDelete(pack.id)}
              deleting={deleting === pack.id}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <PackModal
          pack={modal.pack}
          onClose={() => setModal({ open: false, pack: null })}
          onSaved={() => { setModal({ open: false, pack: null }); load() }}
        />
      )}
    </div>
  )
}

// ── Pack Card ──────────────────────────────────────────────────────────────────

function PackCard({
  pack, dark, onEdit, onDelete, deleting
}: {
  pack: any; dark: boolean
  onEdit: () => void; onDelete: () => void; deleting: boolean
}) {
  const cardBg    = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff'  : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888'
  const subBg     = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc'

  const savings = pack.savings ?? Math.max(0, pack.original_price - pack.pack_price)
  const itemCount = pack.items?.length ?? 0

  return (
    <div style={{
      background: cardBg, borderRadius: 18, border: `1px solid ${border}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
      className="pack-card"
    >
      {/* Image */}
      <div style={{
        width: '100%', height: 160,
        background: subBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {pack.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pack.image_url} alt={pack.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Package2 size={40} style={{ color: textMuted, opacity: 0.25 }} />
        )}
        {/* Approval badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
          background: pack.is_approved
            ? 'rgba(16,185,129,0.9)'
            : 'rgba(245,158,11,0.9)',
          color: '#fff',
        }}>
          {pack.is_approved
            ? <><CheckCircle size={10} /> Live</>
            : <><Clock size={10} /> Pending</>
          }
        </div>
        {/* Savings badge */}
        {savings > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
            background: 'rgba(219,20,46,0.9)', color: '#fff',
          }}>
            <TrendingDown size={10} /> Save {savings.toFixed(3)} TND
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: textMain, margin: '0 0 4px' }}>
            {pack.name}
          </h3>
          {pack.short_description && (
            <p style={{
              fontSize: 12, color: textMuted, margin: 0,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {pack.short_description}
            </p>
          )}
        </div>

        {/* Pricing row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#db142e' }}>
            {fmt(pack.pack_price)}
          </span>
          {pack.original_price > pack.pack_price && (
            <span style={{
              fontSize: 12, color: textMuted,
              textDecoration: 'line-through', fontWeight: 500,
            }}>
              {fmt(pack.original_price)}
            </span>
          )}
        </div>

        {/* Items count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag size={12} color={textMuted} />
          <span style={{ fontSize: 12, color: textMuted }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${border}`,
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px', borderRadius: 10,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
            color: '#3b82f6', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}
        >
          <Edit2 size={12} /> Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <Trash2 size={12} /> {deleting ? '…' : 'Delete'}
        </button>
      </div>

      <style>{`.pack-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }`}</style>
    </div>
  )
}