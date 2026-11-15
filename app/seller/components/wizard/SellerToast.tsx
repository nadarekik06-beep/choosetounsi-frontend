'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

/** Tiny toast for the seller pages: `const { toast, show } = useSellerToast()` → render `toast`. */
export function useSellerToast() {
  const [state, setState] = useState<{ msg: string; ok: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((msg: string, ok = true) => {
    clearTimeout(timer.current)
    setState({ msg, ok })
    timer.current = setTimeout(() => setState(null), 4000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const toast = state ? (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', insetInline: 16, bottom: 'calc(20px + env(safe-area-inset-bottom))', zIndex: 10000,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420,
        background: state.ok ? '#14532d' : '#7f1d1d', color: '#fff', borderRadius: 14,
        padding: '12px 16px', fontSize: 13.5, fontWeight: 700, boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
      }}>
        {state.ok ? <Check size={16} /> : <AlertCircle size={16} />}
        <span style={{ overflowWrap: 'anywhere' }}>{state.msg}</span>
      </div>
    </div>
  ) : null

  return { toast, show }
}
