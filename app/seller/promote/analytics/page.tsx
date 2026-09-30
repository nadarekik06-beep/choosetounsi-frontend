import { redirect } from 'next/navigation'

// Campaign results now live on the Ads home and each campaign's page.
export default function PromoteAnalyticsRedirect() {
  redirect('/seller/promote')
}
