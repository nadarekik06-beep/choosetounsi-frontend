'use client'

import { Suspense } from 'react'
import DealsPage from './_components/DealsPage'
import { RouteLoading } from '@/components/brand/NavigationLoader'

// useSearchParams (filters live in the URL) needs a Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <DealsPage />
    </Suspense>
  )
}
