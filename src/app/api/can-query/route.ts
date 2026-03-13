import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS = 'has_active_plan, free_queries_used'

export async function POST() {
  try {
    // importante: passar cookies e headers para o Supabase reconhecer a sessão
    const supabase = await createServerClient({
      cookies,
      headers,
    })

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
    if (profile.has_active_plan === true) {
      return NextResponse.json({ allowed: true })
    }

    const freeQueriesUsed = profile.free_queries_used ?? 0

    // limite de consultas gratuitas
    if (freeQueriesUsed >= 3) {
      return NextResponse.json({
        allowed: false,
        reason: 'PAYWALL',
      })
    }

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
  } catch (error) {
    console.error('can-query error', error)

    return NextResponse.json(
      { allowed: false, reason: 'ACCESS_CHECK_FAILED' },
      { status: 500 }
    )
  }
}
