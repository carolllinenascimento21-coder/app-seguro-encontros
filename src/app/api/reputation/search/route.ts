import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

type ReputationSearchRequest = {
  nome?: string
  cidade?: string
}

export async function POST(req: Request) {
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

  let body: ReputationSearchRequest
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de reputação', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const nome = body.nome?.trim() ?? ''
  const cidade = body.cidade?.trim() ?? ''

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
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
      'id, nome, cidade, comportamento, seguranca_emocional, respeito, carater, confianca, flags'
    )
    .eq('publica', true)
    .ilike('nome', `%${nome}%`)

  if (cidade) {
    query = query.ilike('cidade', `%${cidade}%`)
  }

  const { data, error } = await query

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
