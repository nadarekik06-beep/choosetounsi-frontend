'use client'

/**
 * app/(client)/account/addresses/page.tsx
 *
 * Full address book management page.
 * Accessible from the account dashboard menu.
 *
 * Features:
 *  - List all saved addresses (default badge, label, wilaya, address, phone)
 *  - Add new address via inline form
 *  - Edit existing address inline
 *  - Delete address (with confirmation)
 *  - Set any address as default
 *  - Max 10 addresses enforced (backend also enforces this)
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin, Plus, Edit2, Trash2, Star, ChevronRight,
  Loader2, CheckCircle, X, Phone, FileText, Home, Briefcase,
} from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

const WILAYAS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia',
  'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
]

const LABEL_SUGGESTIONS = ['Home', 'Work', 'Parents', 'Other']

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserAddress {
  id: number
  label: string
  wilaya: string
  address: string
  phone: string
  notes: string | null
  is_default: boolean
  created_at: string
}

type FormState = {
  label: string
  wilaya: string
  address: string
  phone: string
  notes: string
  is_default: boolean
}

const emptyForm = (): FormState => ({
  label: 'Home', wilaya: '', address: '', phone: '', notes: '', is_default: false,
})

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Request failed')
  return json
}

// ─── Address Card ─────────────────────────────────────────────────────────────

function AddressCard({
  addr,
  onEdit,
  onDelete,
  onSetDefault,
  deleting,
  settingDefault,
}: {
  addr: UserAddress
  onEdit: (a: UserAddress) => void
  onDelete: (id: number) => void
  onSetDefault: (id: number) => void
  deleting: number | null
  settingDefault: number | null
}) {
  const labelIcon = addr.label.toLowerCase().includes('work')
    ? <Briefcase size={13} />
    : <Home size={13} />

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${addr.is_default ? '#db142e' : '#f1f5f9'}`,
      borderRadius: 16,
      padding: '18px 20px',
      position: 'relative',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: addr.is_default ? '0 4px 16px rgba(219,20,46,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>

      {/* Default badge */}
      {addr.is_default && (
        <div style={{
          position: 'absolute', top: -1, right: 16,
          background: '#db142e', color: '#fff',
          fontSize: 9, fontWeight: 800,
          padding: '2px 10px', borderRadius: '0 0 8px 8px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Star size={8} fill="currentColor" /> Default
        </div>
      )}

      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 800, color: '#64748b',
          background: '#f8fafc', border: '1px solid #e5e7eb',
          padding: '3px 10px', borderRadius: 6,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {labelIcon} {addr.label}
        </span>
      </div>

      {/* Info */}
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
        {addr.wilaya}
      </p>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px', lineHeight: 1.5 }}>
        {addr.address}
      </p>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Phone size={11} /> {addr.phone}
      </p>
      {addr.notes && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontStyle: 'italic' }}>
          "{addr.notes}"
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {!addr.is_default && (
          <button
            onClick={() => onSetDefault(addr.id)}
            disabled={settingDefault === addr.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700,
              color: '#db142e', background: 'rgba(219,20,46,0.06)',
              border: '1.5px solid rgba(219,20,46,0.2)',
              borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
              opacity: settingDefault === addr.id ? 0.6 : 1,
            }}
          >
            {settingDefault === addr.id
              ? <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Star size={11} />}
            Set as Default
          </button>
        )}

        <button
          onClick={() => onEdit(addr)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700,
            color: '#3b82f6', background: 'rgba(59,130,246,0.06)',
            border: '1.5px solid rgba(59,130,246,0.2)',
            borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
          }}
        >
          <Edit2 size={11} /> Edit
        </button>

        <button
          onClick={() => onDelete(addr.id)}
          disabled={deleting === addr.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700,
            color: '#94a3b8', background: '#f8fafc',
            border: '1.5px solid #e5e7eb',
            borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
            opacity: deleting === addr.id ? 0.6 : 1,
          }}
        >
          {deleting === addr.id
            ? <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />
            : <Trash2 size={11} />}
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Address Form ─────────────────────────────────────────────────────────────

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: FormState
  onSave: (data: FormState) => void
  onCancel: () => void
  saving: boolean
  error: string
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [errs, setErrs] = useState<Record<string, string>>({})

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.wilaya.trim())  e.wilaya  = 'Please select a wilaya.'
    if (!form.address.trim()) e.address = 'Please enter the address.'
    if (!form.phone.trim())   e.phone   = 'Please enter a phone number.'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSave(form)
  }

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%',
    border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 10,
    padding: '9px 13px',
    fontSize: 13,
    fontFamily: 'inherit',
    color: '#0f172a',
    background: err ? '#fef2f2' : '#fff',
    outline: 'none',
  })

  return (
    <div style={{
      background: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: 16,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Label row */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
            Label
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LABEL_SUGGESTIONS.map(l => (
              <button key={l} onClick={() => set('label', l)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8,
                  border: `1.5px solid ${form.label === l ? '#db142e' : '#e5e7eb'}`,
                  background: form.label === l ? 'rgba(219,20,46,0.07)' : '#fff',
                  color: form.label === l ? '#db142e' : '#64748b',
                  cursor: 'pointer',
                }}>
                {l}
              </button>
            ))}
            {!LABEL_SUGGESTIONS.includes(form.label) && (
              <input value={form.label} onChange={e => set('label', e.target.value)}
                style={{ ...inputStyle(), width: 100 }} placeholder="Custom…" />
            )}
          </div>
        </div>

        {/* Wilaya */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
            Wilaya <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select value={form.wilaya} onChange={e => set('wilaya', e.target.value)}
            style={{ ...inputStyle(errs.wilaya), color: form.wilaya ? '#0f172a' : '#94a3b8' }}>
            <option value="">— Select wilaya —</option>
            {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          {errs.wilaya && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>{errs.wilaya}</p>}
        </div>

        {/* Address */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
            Full Address <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea rows={2} value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Street, building, floor, apartment…"
            style={{ ...inputStyle(errs.address), resize: 'none' }} />
          {errs.address && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>{errs.address}</p>}
        </div>

        {/* Phone */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
            Phone <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input type="tel" value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="e.g. 20 123 456"
            style={inputStyle(errs.phone)} />
          {errs.phone && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>{errs.phone}</p>}
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
            Notes <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'none' }}>(optional)</span>
          </label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Landmark, instructions…"
            style={inputStyle()} />
        </div>

        {/* Set as default checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={form.is_default}
            onChange={e => set('is_default', e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#db142e', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
            Set as my default address
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ fontSize: 13, fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <X size={13} /> Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
              : <><CheckCircle size={13} /> Save Address</>}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const router = useRouter()
  const [addresses,      setAddresses]      = useState<UserAddress[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null)
  const [formError,      setFormError]      = useState('')
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState<number | null>(null)
  const [settingDefault, setSettingDefault] = useState<number | null>(null)
  const [toast,          setToast]          = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchAddresses = useCallback(async () => {
    setLoading(true)
    try {
      const json = await apiRequest('GET', '/addresses')
      setAddresses(json.data ?? [])
    } catch {
      // fail silently — list stays empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    fetchAddresses()
  }, [fetchAddresses, router])

  const handleSave = async (data: FormState) => {
    setSaving(true)
    setFormError('')
    try {
      if (editingAddress) {
        await apiRequest('PUT', `/addresses/${editingAddress.id}`, data)
        // If user checked is_default while editing, set it separately
        if (data.is_default && !editingAddress.is_default) {
          await apiRequest('PATCH', `/addresses/${editingAddress.id}/default`)
        }
        showToast('Address updated successfully.')
      } else {
        await apiRequest('POST', '/addresses', data)
        showToast('Address saved successfully.')
      }
      setShowForm(false)
      setEditingAddress(null)
      await fetchAddresses()
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to save address.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return
    setDeleting(id)
    try {
      await apiRequest('DELETE', `/addresses/${id}`)
      showToast('Address deleted.')
      await fetchAddresses()
    } catch {
      showToast('Failed to delete address.')
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (id: number) => {
    setSettingDefault(id)
    try {
      await apiRequest('PATCH', `/addresses/${id}/default`)
      showToast('Default address updated.')
      await fetchAddresses()
    } catch {
      showToast('Failed to update default.')
    } finally {
      setSettingDefault(null)
    }
  }

  const openEdit = (addr: UserAddress) => {
    setEditingAddress(addr)
    setShowForm(false)
    setFormError('')
  }

  const openNew = () => {
    setEditingAddress(null)
    setShowForm(true)
    setFormError('')
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingAddress(null)
    setFormError('')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
            <ChevronRight size={11} />
            <Link href="/profile" style={{ color: '#94a3b8', textDecoration: 'none' }}>Account</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>Address Book</span>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px', animation: 'fadeUp 0.35s ease both' }}>

          {/* Page title + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(219,20,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} color="#db142e" />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Address Book</h1>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                  {addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            {addresses.length < 10 && !showForm && !editingAddress && (
              <button onClick={openNew}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(219,20,46,0.25)' }}>
                <Plus size={14} /> Add Address
              </button>
            )}
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ marginBottom: 16, animation: 'fadeUp 0.25s ease both' }}>
              <AddressForm
                initial={emptyForm()}
                onSave={handleSave}
                onCancel={cancelForm}
                saving={saving}
                error={formError}
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 size={26} style={{ animation: 'spin 0.7s linear infinite', color: '#db142e', margin: '0 auto 10px' }} />
              <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading addresses…</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && addresses.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '2px dashed #e5e7eb' }}>
              <MapPin size={40} color="#e2e8f0" style={{ margin: '0 auto 14px' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>No saved addresses</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>Save your delivery addresses for faster checkout.</p>
              <button onClick={openNew}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}>
                <Plus size={14} /> Add Your First Address
              </button>
            </div>
          )}

          {/* Address cards */}
          {!loading && addresses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {addresses.map(addr => (
                editingAddress?.id === addr.id ? (
                  <div key={addr.id} style={{ animation: 'fadeUp 0.25s ease both' }}>
                    <AddressForm
                      initial={{
                        label:      addr.label,
                        wilaya:     addr.wilaya,
                        address:    addr.address,
                        phone:      addr.phone,
                        notes:      addr.notes ?? '',
                        is_default: addr.is_default,
                      }}
                      onSave={handleSave}
                      onCancel={cancelForm}
                      saving={saving}
                      error={formError}
                    />
                  </div>
                ) : (
                  <div key={addr.id} style={{ animation: 'fadeUp 0.25s ease both' }}>
                    <AddressCard
                      addr={addr}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onSetDefault={handleSetDefault}
                      deleting={deleting}
                      settingDefault={settingDefault}
                    />
                  </div>
                )
              ))}
            </div>
          )}

          {/* Limit notice */}
          {addresses.length >= 10 && (
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>
              Maximum of 10 addresses reached. Delete one to add a new address.
            </p>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff',
          padding: '10px 22px', borderRadius: 999,
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
          animation: 'toastIn 0.3s ease',
          zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          <CheckCircle size={14} color="#10b981" />
          {toast}
        </div>
      )}
    </>
  )
}