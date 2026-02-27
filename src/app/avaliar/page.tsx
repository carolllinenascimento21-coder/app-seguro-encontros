export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AvaliarClient from './AvaliarClient'

export default async function AvaliarPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?next=/avaliar')
  }

  return (
    <Suspense fallback={null}>
      <AvaliarClient />
    </Suspense>
  )
}
