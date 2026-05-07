import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'
import { hasPaidReputationAccess } from '@/lib/reputation/access-control'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
  credits: number | null
}

const PROFILE_ACCESS_FIELDS =
  'has_active_plan, current_plan_id, subscription_status, free_queries_used, credits'

export async function POST(req: Request) {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/consume-query')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

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
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
    return NextResponse.json({ error: 'Erro ao carregar sessão' }, { status: 401 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError?.code === 'AuthSessionMissingError' || authError || !user) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  let body: { userId?: string }
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de consume-query', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body.userId || body.userId !== user.id) {
    return NextResponse.json({ error: 'Usuária inválida' }, { status: 403 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_ACCESS_FIELDS)
    .eq('id', body.userId)
    .maybeSingle<ProfileAccessRow>()

  if (profileError || !profile) {
    if (profileError) {
      console.error('Erro ao carregar perfil para consumo de consulta', profileError)
    }

    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  let freeQueriesUsed = Math.max(0, Number(profile.free_queries_used ?? 0))
  const credits = Math.max(0, Number(profile.credits ?? 0))

  if (!hasPaidReputationAccess(profile)) {
    if (freeQueriesUsed >= 3) {
      return NextResponse.json({ success: false, reason: 'PAYWALL' }, { status: 200 })
    }

    freeQueriesUsed += 1

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ free_queries_used: freeQueriesUsed })
      .eq('id', body.userId)

    if (updateError) {
      console.error('Erro ao atualizar consumo de consulta', updateError)
      return NextResponse.json({ error: 'Erro ao consumir consulta' }, { status: 500 })
    }
  }

  const { error: consultaError } = await supabaseAdmin
    .from('consultas')
    .insert({ user_id: body.userId })

  if (consultaError) {
    console.error('Erro ao registrar consulta', consultaError)
  }

  return NextResponse.json({
    success: true,
    state: [
      {
        plan: profile.current_plan_id ?? 'free',
        free_queries_used: freeQueriesUsed,
        credits,
      },
    ],
  })
}
