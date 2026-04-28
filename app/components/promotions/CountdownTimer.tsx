'use client'

import { useState, useEffect } from 'react'

interface Props {
  endsAt: string       // ISO string
  compact?: boolean    // true = "2h 14m" | false = full boxes
  onExpire?: () => void
}

interface TimeLeft { hours: number; minutes: number; seconds: number }

function calcTimeLeft(endsAt: string): TimeLeft | null {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    hours:   Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

export default function CountdownTimer({ endsAt, compact = false, onExpire }: Props) {
  const [tl, setTl] = useState<TimeLeft | null>(() => calcTimeLeft(endsAt))

  useEffect(() => {
    const id = setInterval(() => {
      const next = calcTimeLeft(endsAt)
      setTl(next)
      if (!next) { clearInterval(id); onExpire?.() }
    }, 1000)
    return () => clearInterval(id)
  }, [endsAt, onExpire])

  if (!tl) return (
    <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af' }}>Ended</span>
  )

  const pad = (n: number) => String(n).padStart(2, '0')

  if (compact) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 800, color: '#dc2626',
        fontVariantNumeric: 'tabular-nums',
      }}>
        ⏱ {tl.hours > 0 ? `${tl.hours}h ` : ''}{pad(tl.minutes)}m {pad(tl.seconds)}s
      </span>
    )
  }

  const Box = ({ val, label }: { val: number; label: string }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#dc2626', borderRadius: 6, padding: '4px 7px', minWidth: 34,
    }}>
      <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {pad(val)}
      </span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {tl.hours > 0 && <><Box val={tl.hours} label="hr" /><span style={{ color: '#dc2626', fontWeight: 900, fontSize: 13 }}>:</span></>}
      <Box val={tl.minutes} label="min" />
      <span style={{ color: '#dc2626', fontWeight: 900, fontSize: 13 }}>:</span>
      <Box val={tl.seconds} label="sec" />
    </div>
  )
}