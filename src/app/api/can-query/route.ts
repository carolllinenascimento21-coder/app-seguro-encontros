import { NextResponse } from 'next/server'

import { FREE_PLAN } from '@/lib/billing'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      if (userError) {
        console.error('can-query auth error', userError)
      }
      return NextResponse.json({ allowed: false, reason: 'not_logged' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, free_queries_used, credits')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('can-query profile error', profileError)
      return NextResponse.json({ allowed: false, reason: 'no_plan' })
    }

    if (!profile) {
      return NextResponse.json({ allowed: false, reason: 'no_plan' })
    }

    const plan = profile.plan ?? FREE_PLAN
    const freeQueriesUsed = profile.free_queries_used ?? 0
    const credits = profile.credits ?? 0

    const allowed =
      plan !== FREE_PLAN ||
      freeQueriesUsed < 3 ||
      credits > 0

    if (!allowed) {
      return NextResponse.json({ allowed: false, reason: 'PAYWALL' })
    }

    return NextResponse.json({ allowed: true })
  } catch (error) {
    console.error('can-query error', error)
    return NextResponse.json({ allowed: false })
  }
}
