import { Suspense } from 'react'
import AvaliarClient from './AvaliarClient'

export default function AvaliarPage() {
  return (
    <Suspense fallback={null}>
      <AvaliarClient />
    </Suspense>
  )
}
