'use client'

/**
 * components/ComplaintModal.tsx
 *
 * Modal complaint form opened from the "My Orders" page.
 * Order is pre-filled and locked.
 *
 * Usage:
 *   <ComplaintModal
 *     orderId={order.id}
 *     orderNumber={order.order_number}
 *     isOpen={modalOpen}
 *     onClose={() => setModalOpen(false)}
 *   />
 */

import { useState, useEffect, useCallback } from 'react'
import ComplaintForm from './ComplaintForm'

const RED = '#db142e'

interface ComplaintModalProps {
  orderId: number
  orderNumber: string
  isOpen: boolean
  onClose: () => void
}

export default function ComplaintModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
}: ComplaintModalProps) {
  const [success, setSuccess] = useState(false)

  // Reset state when modal re-opens
  useEffect(() => {
    if (isOpen) setSuccess(false)
  }, [isOpen])

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: 560,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
        zIndex: 10001,
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky', top: 0,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              File a Complaint
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>
              Order #{orderNumber}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e5e7eb',
              background: '#f8fafc', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
              fontSize: 16, fontWeight: 900 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                Complaint Submitted!
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.7 }}>
                Your complaint is being reviewed. You will receive a notification
                once a decision is made.
              </p>
              <button onClick={onClose}
                style={{ padding: '10px 28px', background: RED, color: '#fff',
                  fontWeight: 800, fontSize: 13, borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
          ) : (
            <ComplaintForm
              prefilledOrderId={orderId}
              onSuccess={() => setSuccess(true)}
              onCancel={onClose}
              compact
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translate(-50%,-48%) } to { opacity:1; transform:translate(-50%,-50%) } }
      `}</style>
    </>
  )
}