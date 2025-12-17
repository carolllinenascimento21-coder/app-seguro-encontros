import { Suspense } from 'react'
import AceitarTermosClient from './AceitarTermosClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AceitarTermosClient />
    </Suspense>
  )
}
