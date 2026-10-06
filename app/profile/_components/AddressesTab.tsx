'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MapPin, Plus, Pencil, Trash2, Star, Home, Briefcase, Phone, AlertTriangle } from 'lucide-react'
import { useWilayaLabel } from '@/lib/i18n/wilayas'
import { formatShippingAddress, isCompleteShippingAddress, shippingAddressFrom } from '@/lib/shippingAddress'
import { addressApi, type Profile, type SavedAddress } from '@/lib/profileApi'
import AddressForm from '@/components/profile/AddressForm'
import { EmptyState, Modal, Skeleton } from '@/components/profile/ui'
import { BusyLabel } from '@/components/brand/BrandLoader'

const MAX = 10
const LABELS = ['Home', 'Work', 'Parents', 'Other']

export default function AddressesTab({ profile, onChanged, toast, autoAdd }: {
  profile: Profile | null
  /** An address was added/removed: completion may have changed. */
  onChanged: () => void
  toast: (msg: string, kind?: 'success' | 'error') => void
  autoAdd?: boolean
}) {
  const t  = useTranslations('profile.addresses')
  const ta = useTranslations('addresses')
  const tl = useTranslations('addresses.labels')
  const wilayaLabel = useWilayaLabel()

  const [list, setList] = useState<SavedAddress[] | null>(null)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(autoAdd ? 'new' : null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    setError(false)
    addressApi.list().then(setList).catch(() => setError(true))
  }, [])
  useEffect(load, [load])

  const labelOf = (v: string) => (LABELS.includes(v) ? tl(v.toLowerCase()) : v)

  const saved = () => {
    const wasNew = editing === 'new'
    setEditing(null)
    toast(wasNew ? ta('toast.saved') : ta('toast.updated'))
    load()
    onChanged()
  }

  const makeDefault = async (a: SavedAddress) => {
    setBusyId(a.id)
    // optimistic
    setList(l => l?.map(x => ({ ...x, is_default: x.id === a.id })) ?? l)
    try {
      await addressApi.setDefault(a.id)
      toast(ta('toast.defaultUpdated'))
    } catch {
      toast(ta('toast.defaultFailed'), 'error')
      load()
    } finally { setBusyId(null) }
  }

  const remove = async (id: number) => {
    setConfirmId(null)
    setBusyId(id)
    const before = list
    setList(l => l?.filter(x => x.id !== id) ?? l)
    try {
      await addressApi.remove(id)
      toast(ta('toast.deleted'))
      load()
      onChanged()
    } catch {
      setList(before)
      toast(ta('toast.deleteFailed'), 'error')
    } finally { setBusyId(null) }
  }

  return (
    <div className="pf-panel">
      <section className="pf-card" aria-labelledby="pf-addr-title">
        <div className="pf-card-head">
          <div>
            <h2 id="pf-addr-title">{t('title')}</h2>
            <p className="pf-card-sub">{t('subtitle')}</p>
          </div>
          {list && list.length > 0 && list.length < MAX && (
            <button type="button" className="pf-btn primary sm" onClick={() => setEditing('new')}><Plus size={15} />{ta('add')}</button>
          )}
        </div>

        {error ? (
          <div className="pf-alert error" role="alert">{t('loadError')} <button className="pf-link" onClick={load}>{t('retry')}</button></div>
        ) : !list ? (
          <div style={{ display: 'grid', gap: 10 }}>{[0, 1].map(i => <Skeleton key={i} h={96} r={16} />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={<MapPin size={34} />} title={ta('emptyTitle')} body={t('emptyBody')}
            action={<button type="button" className="pf-btn primary" onClick={() => setEditing('new')}><Plus size={15} />{ta('addFirst')}</button>} />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map(a => {
              const needsFix = !isCompleteShippingAddress(shippingAddressFrom(a))
              return (
                <article key={a.id} className={`pf-addr${a.is_default ? ' default' : ''}`} aria-busy={busyId === a.id}>
                  <span className="pf-addr-icon" aria-hidden>
                    {a.label === 'Work' ? <Briefcase size={17} /> : a.label === 'Home' ? <Home size={17} /> : <MapPin size={17} />}
                  </span>
                  <div className="pf-addr-body">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                      <strong>{labelOf(a.label)}</strong>
                      {a.is_default && <span className="pf-status delivered">{ta('default')}</span>}
                      {needsFix && <span className="pf-status pending"><AlertTriangle size={11} />{t('incomplete')}</span>}
                    </div>
                    {a.recipient_name && <div style={{ color: '#2b2b31', fontWeight: 600 }} dir="auto">{a.recipient_name}</div>}
                    <div dir="auto">{formatShippingAddress(shippingAddressFrom(a), wilayaLabel)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /><span dir="ltr">+216 {a.phone}</span></div>
                    <div className="pf-addr-actions">
                      <button type="button" className="pf-btn light sm" onClick={() => setEditing(a)}><Pencil size={13} />{ta('edit')}</button>
                      {!a.is_default && (
                        <button type="button" className="pf-btn light sm" onClick={() => makeDefault(a)} disabled={busyId === a.id}><BusyLabel busy={busyId === a.id} size={13}><Star size={13} />{ta('setDefault')}</BusyLabel></button>
                      )}
                      {confirmId === a.id ? (
                        <>
                          <button type="button" className="pf-btn danger sm" onClick={() => remove(a.id)}>{t('confirmDelete')}</button>
                          <button type="button" className="pf-btn light sm" onClick={() => setConfirmId(null)}>{t('keep')}</button>
                        </>
                      ) : (
                        <button type="button" className="pf-btn danger sm" onClick={() => setConfirmId(a.id)} aria-label={`${ta('delete')} — ${labelOf(a.label)}`}><Trash2 size={13} />{ta('delete')}</button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
            {list.length >= MAX && <p className="pf-hint">{ta('limit')}</p>}
          </div>
        )}
        <p className="pf-hint" style={{ marginTop: 14 }}>
          {t('checkoutHint')} <Link href="/account/addresses" className="pf-link">{t('openBook')}</Link>
        </p>
      </section>

      {editing && (
        <Modal title={editing === 'new' ? ta('add') : t('editTitle')} onClose={() => setEditing(null)}>
          <AddressForm
            initial={editing === 'new' ? undefined : editing}
            forceDefault={editing === 'new' && (list?.length ?? 0) === 0}
            prefill={profile ? {
              recipient_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.name,
              phone: profile.phone ?? '',
            } : undefined}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
