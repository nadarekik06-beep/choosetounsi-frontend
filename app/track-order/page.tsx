'use client'

// Public "Track my order" (FR / EN / AR): orders saved on this phone, find one
// by number + phone, or all orders of the phone (one number still required).
// /track-order?order=ORD-… fills the number in (links in e-mails / the admin).

import { useSearchParams } from 'next/navigation'
import GuestOrdersHub from '@/components/guest/GuestOrdersHub'

export default function TrackOrderPage() {
  const order = useSearchParams().get('order') ?? ''
  return <GuestOrdersHub initialOrderNumber={order.slice(0, 40)} />
}
