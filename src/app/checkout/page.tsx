import { Suspense } from 'react'
import CheckoutClient from './CheckoutClient'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div />}>
      <CheckoutClient />
    </Suspense>
  )
}
