import { Suspense } from 'react'
import AceitarTermosClient from './AceitarTermosClient'

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <AceitarTermosClient />
    </Suspense>
  )
}
