import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20

export async function GET(req: Request) {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/busca')
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

  const supabase = createRouteHandlerClient({ cookies })

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

  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('q')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''
  const limitParam = Number(searchParams.get('limit'))
  const offsetParam = Number(searchParams.get('offset'))

  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0

  if (!nome && !cidade) {
    return NextResponse.json(
      { error: 'Informe nome ou cidade para buscar' },
      { status: 400 }
    )
  }

  const { data: accessState, error: accessError } = await supabaseAdmin.rpc(
    'consume_query',
    {
      user_uuid: user.id,
    }
  )

  if (accessError) {
    const message = accessError.message ?? ''
    if (message.includes('PAYWALL')) {
      return NextResponse.json({ allowed: false, reason: 'PAYWALL' }, { status: 200 })
    }
    console.error('Erro ao consumir consulta', accessError)
    return NextResponse.json({ error: 'Erro ao validar créditos' }, { status: 500 })
  }

  let query = supabaseAdmin
    .from('avaliacoes')
    .select(
      'id, nome, cidade, comportamento, seguranca_emocional, respeito, carater, confianca, flags_positive, flags_negative'
    )
    .eq('is_anonymous', false)
    .eq('publica', true)

  if (nome) {
    query = query.ilike('nome', `%${nome}%`)
  }

  if (cidade) {
    query = query.ilike('cidade', `%${cidade}%`)
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Erro ao buscar reputação', error)
    return NextResponse.json({ error: 'Erro ao buscar reputação' }, { status: 500 })
  }

  const state = Array.isArray(accessState) ? accessState[0] : null

  return NextResponse.json({
    allowed: true,
    results: data ?? [],
    profile: state
      ? {
          plan: state.plan,
          freeQueriesUsed: state.free_queries_used ?? state.freeQueriesUsed ?? 0,
          credits: state.credits ?? 0,
        }
      : null,
  })
}
