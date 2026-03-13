import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS = 'has_active_plan, current_plan_id, subscription_status, free_queries_used'

const hasPaidSubscription = (profile: ProfileAccessRow) => {
  if (profile.has_active_plan === true) return true

  const subscriptionStatus = profile.subscription_status?.toLowerCase()
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return true
  }

  return Boolean(profile.current_plan_id && profile.current_plan_id !== 'free')
}

export async function POST() {
  try {
    // inicializa o contexto de cookies da requisição para o Supabase SSR
    await cookies()

    const supabase = await createServerClient()

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

    // usuário com plano ativo → acesso liberado
    if (hasPaidSubscription(profile)) {
      return NextResponse.json({ allowed: true })
    }

    const freeQueriesUsed = profile.free_queries_used ?? 0

    if (freeQueriesUsed < 3) {
      // incrementa consulta gratuita
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          free_queries_used: freeQueriesUsed + 1,
        })
        .eq('id', user.id)
        .select(PROFILE_ACCESS_FIELDS)
        .maybeSingle<ProfileAccessRow>()

      if (updateError) {
        console.error('can-query increment error', updateError)

        return NextResponse.json(
          { allowed: false, reason: 'ACCESS_CHECK_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({ allowed: true })
    }

    return NextResponse.json({
      allowed: false,
      reason: 'PAYWALL',
    })
  } catch (error) {
    console.error('can-query error', error)

    return NextResponse.json(
      { allowed: false, reason: 'ACCESS_CHECK_FAILED' },
      { status: 500 }
    )
  }
}
