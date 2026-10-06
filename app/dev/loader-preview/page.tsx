import { notFound } from 'next/navigation'
import LoaderPreview from './LoaderPreview'

// Temporary design page for <BrandLoader />. Not served in production builds.
export const metadata = { title: 'Loader preview', robots: { index: false } }

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <LoaderPreview />
}
