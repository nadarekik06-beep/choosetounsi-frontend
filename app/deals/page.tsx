'use client'

import { Suspense } from 'react'
import DealsPage from './_components/DealsPage'

// useSearchParams (filters live in the URL) needs a Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={null}>
      <DealsPage />
    </Suspense>
  )
}
