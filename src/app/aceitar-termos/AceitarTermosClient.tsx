'use client'

import { useSearchParams } from 'next/navigation'

export default function AceitarTermosClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div>
      <h1>Aceitar Termos</h1>
      <p>Token: {token}</p>
    </div>
  )
}
