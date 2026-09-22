// seller-dashboard/app/seller/earnings/page.tsx
'use client'
import dynamic from 'next/dynamic'
const EarningsPage = dynamic(() => import('./EarningsPage'), { ssr: false })
export default function Page() { return <EarningsPage /> }