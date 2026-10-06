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

import { fallbackError } from '@/lib/i18n/clientLocale'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin, Plus, Edit2, Trash2, Star, ChevronRight,
  CheckCircle, X, Phone, FileText, Home, Briefcase,
} from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'
import { useTranslations } from 'next-intl'
import { useWilayaLabel } from '@/lib/i18n/wilayas'
import ShippingAddressFields from '@/components/address/ShippingAddressFields'
import {
  emptyShippingAddress, shippingAddressFrom, validateShippingAddress, isCompleteShippingAddress,
  shippingAddressPayload, formatShippingAddress, type ShippingAddressForm,
} from '@/lib/shippingAddress'

import BrandLoader from '@/components/brand/BrandLoader'
import { usePageLoading } from '@/components/brand/NavigationLoader'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ct_auth_token')
}

// Stored values stay in English; only their display label is translated.
const LABEL_SUGGESTIONS = ['Home', 'Work', 'Parents', 'Other']

function useAddressLabel() {
  const t = useTranslations('addresses.labels')
  return (value: string) => (LABEL_SUGGESTIONS.includes(value) ? t(value.toLowerCase()) : value)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserAddress {
  id: number
  label: string
  // Structured fields (2026-10) are null on addresses saved before them
  recipient_name: string | null
  wilaya: string
  delegation: string | null
  address: string
  postal_code: string | null
  phone: string
  phone_secondary: string | null
  notes: string | null
  is_default: boolean
  created_at: string
}

type FormState = ShippingAddressForm & {
  label: string
  is_default: boolean
}

const emptyForm = (): FormState => ({ ...emptyShippingAddress(), label: 'Home', is_default: false })

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
  if (!res.ok) throw new Error(json.message ?? fallbackError('request'))  // backend message is localized
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
  const t = useTranslations('addresses')
  const tsa = useTranslations('shippingAddress')
  const labelText = useAddressLabel()
  const wilayaLabel = useWilayaLabel()
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
          position: 'absolute', top: -1, insetInlineEnd: 16,
          background: '#db142e', color: '#fff',
          fontSize: 9, fontWeight: 800,
          padding: '2px 10px', borderRadius: '0 0 8px 8px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Star size={8} fill="currentColor" /> {t('default')}
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
          {labelIcon} {labelText(addr.label)}
        </span>
      </div>

      {/* Info */}
      <p dir="auto" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
        {addr.recipient_name || wilayaLabel(addr.wilaya)}
      </p>
      <p dir="auto" style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px', lineHeight: 1.5 }}>
        {formatShippingAddress({ address: addr.address, delegation: addr.delegation ?? '', postal_code: addr.postal_code ?? '', wilaya: addr.wilaya }, wilayaLabel)}
      </p>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Phone size={11} /> <span dir="ltr">{addr.phone}{addr.phone_secondary ? ` / ${addr.phone_secondary}` : ''}</span>
      </p>
      {!isCompleteShippingAddress(shippingAddressFrom(addr)) && (
        <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0', fontWeight: 600 }}>{tsa('completeSaved')}</p>
      )}
      {addr.notes && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontStyle: 'italic' }}>
          {addr.notes}
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
              ? <BrandLoader variant="inline" size={11} />
              : <Star size={11} />}
            {t('setDefault')}
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
          <Edit2 size={11} /> {t('edit')}
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
            ? <BrandLoader variant="inline" size={11} />
            : <Trash2 size={11} />}
          {t('delete')}
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
  const t  = useTranslations('addresses')
  const tc = useTranslations('common')
  const labelText = useAddressLabel()
  const [form, setForm] = useState<FormState>(initial)
  const [errs, setErrs] = useState<Record<string, string>>({})

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  // Same rules as checkout (lib/shippingAddress.ts): a saved address always passes checkout
  const validate = () => {
    const e = validateShippingAddress(form) as Record<string, string>
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
            {t('label')}
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LABEL_SUGGESTIONS.map(l => (
              <button key={l} type="button" onClick={() => set('label', l)} aria-pressed={form.label === l}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8,
                  border: `1.5px solid ${form.label === l ? '#db142e' : '#e5e7eb'}`,
                  background: form.label === l ? 'rgba(219,20,46,0.07)' : '#fff',
                  color: form.label === l ? '#db142e' : '#64748b',
                  cursor: 'pointer',
                }}>
                {labelText(l)}
              </button>
            ))}
            {!LABEL_SUGGESTIONS.includes(form.label) && (
              <input value={form.label} onChange={e => set('label', e.target.value)}
                style={{ ...inputStyle(), width: 100 }} placeholder={t('custom')} aria-label={t('label')} />
            )}
          </div>
        </div>

        <ShippingAddressFields
          value={form}
          errors={errs}
          onChange={(k, v) => { set(k, v); if (errs[k]) setErrs(prev => ({ ...prev, [k]: '' })) }}
        />

        {/* Set as default checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={form.is_default}
            onChange={e => set('is_default', e.target.checked)}
            style={{ width: 15, height: 15, accentColor: '#db142e', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
            {t('makeDefault')}
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ fontSize: 13, fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <X size={13} /> {tc('cancel')}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><BrandLoader variant="inline" size={13} /> {tc('saving')}</>
              : <><CheckCircle size={13} /> {t('save')}</>}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const t      = useTranslations('addresses')
  const tc     = useTranslations('common')
  const router = useRouter()
  const [addresses,      setAddresses]      = useState<UserAddress[]>([])
  const [loading,        setLoading]        = useState(true)
  // holds the navigation loader until the first load is done
  usePageLoading(loading)
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
        await apiRequest('PUT', `/addresses/${editingAddress.id}`, { ...shippingAddressPayload(data), label: data.label })
        // If user checked is_default while editing, set it separately
        if (data.is_default && !editingAddress.is_default) {
          await apiRequest('PATCH', `/addresses/${editingAddress.id}/default`)
        }
        showToast(t('toast.updated'))
      } else {
        await apiRequest('POST', '/addresses', { ...shippingAddressPayload(data), label: data.label, is_default: data.is_default })
        showToast(t('toast.saved'))
      }
      setShowForm(false)
      setEditingAddress(null)
      await fetchAddresses()
    } catch (e: any) {
      setFormError(e.message ?? t('toast.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return
    setDeleting(id)
    try {
      await apiRequest('DELETE', `/addresses/${id}`)
      showToast(t('toast.deleted'))
      await fetchAddresses()
    } catch {
      showToast(t('toast.deleteFailed'))
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (id: number) => {
    setSettingDefault(id)
    try {
      await apiRequest('PATCH', `/addresses/${id}/default`)
      showToast(t('toast.defaultUpdated'))
      await fetchAddresses()
    } catch {
      showToast(t('toast.defaultFailed'))
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
          <nav aria-label={t('breadcrumb')} style={{ maxWidth: 680, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>{tc('home')}</Link>
            <ChevronRight size={11} />
            <Link href="/profile" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('account')}</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{t('title')}</span>
          </nav>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px', animation: 'fadeUp 0.35s ease both' }}>

          {/* Page title + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(219,20,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} color="#db142e" />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{t('title')}</h1>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                  {t('count', { count: addresses.length })}
                </p>
              </div>
            </div>

            {addresses.length < 10 && !showForm && !editingAddress && (
              <button onClick={openNew}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(219,20,46,0.25)' }}>
                <Plus size={14} /> {t('add')}
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
            <BrandLoader variant="section" label={t('loading')} minHeight={220} />
          )}

          {/* Empty state */}
          {!loading && addresses.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20, border: '2px dashed #e5e7eb' }}>
              <MapPin size={40} color="#e2e8f0" style={{ margin: '0 auto 14px' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{t('emptyTitle')}</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>{t('emptyBody')}</p>
              <button onClick={openNew}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg,#db142e,#b91c1c)', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}>
                <Plus size={14} /> {t('addFirst')}
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
                        ...shippingAddressFrom(addr),
                        label:      addr.label,
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
              {t('limit')}
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