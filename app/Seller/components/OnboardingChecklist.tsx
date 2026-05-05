'use client'

import { CheckCircle, Circle, Package, User, Truck, ChevronRight } from 'lucide-react'

interface OnboardingChecklistProps {
  totalProducts: number
  hasProfilePicture: boolean
  dark: boolean
}

interface CheckItem {
  id: string
  label: string
  description: string
  done: boolean
  href: string
  icon: React.ElementType
}

export default function OnboardingChecklist({ totalProducts, hasProfilePicture, dark }: OnboardingChecklistProps) {
  const bg        = dark ? '#161b27' : '#ffffff'
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const textMain  = dark ? '#fff' : '#111'
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : '#888'

  const items: CheckItem[] = [
    {
      id: 'first_product',
      label: 'Add your first product',
      description: 'List a product so buyers can discover your store',
      done: totalProducts > 0,
      href: '/seller/products/new',
      icon: Package,
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      description: 'Add a profile picture and social links',
      done: hasProfilePicture,
      href: '/seller/settings',
      icon: User,
    },
    {
      id: 'delivery',
      label: 'Review delivery options',
      description: 'Make sure buyers know your shipping options',
      done: false,
      href: '/seller/settings',
      icon: Truck,
    },
  ]

  const completedCount = items.filter(i => i.done).length
  const allDone = completedCount === items.length

  if (allDone) return null

  return (
    <div style={{ background: bg, borderRadius: 18, border: `1px solid ${border}`, overflow: 'hidden', marginBottom: 4 }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 900, fontSize: 15, color: textMain, margin: '0 0 2px', letterSpacing: '-0.01em' }}>
            🚀 Getting Started
          </p>
          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>
            {completedCount} of {items.length} steps completed
          </p>
        </div>
        <div style={{ width: 80 }}>
          <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #db142e, #ff4060)',
              width: `${(completedCount / items.length) * 100}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <p style={{ fontSize: 10, color: textMuted, margin: '4px 0 0', textAlign: 'right' }}>
            {Math.round((completedCount / items.length) * 100)}%
          </p>
        </div>
      </div>

      {/* Items */}
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <a
            key={item.id}
            href={item.done ? undefined : item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              borderBottom: idx < items.length - 1 ? `1px solid ${border}` : 'none',
              textDecoration: 'none',
              cursor: item.done ? 'default' : 'pointer',
              transition: 'background 0.15s ease',
              opacity: item.done ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!item.done) (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.03)' : '#fafafa' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {/* Status icon */}
            <div style={{ flexShrink: 0 }}>
              {item.done
                ? <CheckCircle size={20} color="#198f41" />
                : <Circle size={20} color={dark ? 'rgba(255,255,255,0.2)' : '#d1d5db'} />}
            </div>

            {/* Step icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: item.done
                ? 'rgba(25,143,65,0.1)'
                : dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={17} color={item.done ? '#198f41' : (dark ? 'rgba(255,255,255,0.4)' : '#9ca3af')} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, margin: '0 0 2px',
                color: item.done ? (dark ? 'rgba(255,255,255,0.4)' : '#9ca3af') : textMain,
                textDecoration: item.done ? 'line-through' : 'none',
              }}>
                {item.label}
              </p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{item.description}</p>
            </div>

            {/* Arrow (only if not done) */}
            {!item.done && <ChevronRight size={15} color={dark ? 'rgba(255,255,255,0.25)' : '#d1d5db'} style={{ flexShrink: 0 }} />}
          </a>
        )
      })}
    </div>
  )
}