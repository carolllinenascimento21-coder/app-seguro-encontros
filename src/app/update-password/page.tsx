import { Suspense } from 'react'
import UpdatePasswordClient from './UpdatePasswordClient'

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <UpdatePasswordClient />
    </Suspense>
  )
}
