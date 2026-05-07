import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { canUseFreeReputationQuery, hasPaidReputationAccess } from '@/lib/reputation/access-control'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS =
  'has_active_plan, current_plan_id, subscription_status, free_queries_used'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      if (userError) {
        console.error('can-query auth error', userError)
      }

      return NextResponse.json(
        { allowed: false, reason: 'NOT_LOGGED' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_ACCESS_FIELDS)
      .eq('id', user.id)
      .maybeSingle<ProfileAccessRow>()

    if (profileError || !profile) {
      if (profileError) {
        console.error('can-query profile error', profileError)
      }

      return NextResponse.json(
        { allowed: false, reason: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Usuário com plano pago pode consultar ilimitado
    if (hasPaidReputationAccess(profile)) {
      return NextResponse.json({ allowed: true, profile })
    }

    // Plano free permite até 3 consultas
    if (canUseFreeReputationQuery(profile)) {
      return NextResponse.json({ allowed: true, profile })
    }

    // Paywall: usuário free atingiu limite
    return NextResponse.json(
      {
        allowed: false,
        reason: 'PAYWALL',
        profile,
      },
      { status: 403 }
    )
  } catch (error) {
    console.error('can-query error', error)

    return NextResponse.json(
      { allowed: false, reason: 'ACCESS_CHECK_FAILED' },
      { status: 500 }
    )
  }
}
