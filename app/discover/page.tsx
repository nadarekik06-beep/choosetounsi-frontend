import { permanentRedirect } from 'next/navigation'

// /discover was the previous name of the shop page.
export default function Page() {
  permanentRedirect('/shop')
}
