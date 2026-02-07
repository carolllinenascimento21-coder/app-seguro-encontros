import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20
const FREE_LIMIT = 1

export async function GET(req: Request) {
  /* ────────────────────────────────────────────────
   * 1️⃣ Ambiente público
   * ──────────────────────────────────────────────── */
  try {
    getSupabasePublicEnv('api/busca')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  /* ────────────────────────────────────────────────
   * 2️⃣ Supabase
   * ──────────────────────────────────────────────── */
  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  /* ────────────────────────────────────────────────
   * 3️⃣ Parâmetros
   * ──────────────────────────────────────────────── */
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')?.trim() ?? ''
  const cidade = searchParams.get('cidade')?.trim() ?? ''

  if (!nome && !cidade) {
    return NextResponse.json(
      { error: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  /* ────────────────────────────────────────────────
   * 4️⃣ Carregar perfil da usuária
   * ──────────────────────────────────────────────── */
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('has_active_plan, current_plan_id, free_queries_used')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Erro ao carregar perfil', profileError)
    return NextResponse.json(
      { error: 'Erro ao validar perfil' },
      { status: 500 }
    )
  }

  const isFree =
    !profile.has_active_plan || profile.current_plan_id === 'free'

  /* ────────────────────────────────────────────────
   * 5️⃣ Tracking: tentativa de busca
   * ──────────────────────────────────────────────── */
  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'consult_basic',
    metadata: {
      nome: !!nome,
      cidade: !!cidade,
      plan: profile.current_plan_id ?? 'free',
    },
  })

  /* ────────────────────────────────────────────────
   * 6️⃣ PAYWALL FREE
   * ──────────────────────────────────────────────── */
  if (isFree && (profile.free_queries_used ?? 0) >= FREE_LIMIT) {
    await supabaseAdmin.from('analytics_events').insert({
      user_id: user.id,
      event_name: 'free_limit_reached',
      metadata: {
        location: 'api/busca',
      },
    })

    return NextResponse.json(
      {
        allowed: false,
        code: 'FREE_LIMIT_REACHED',
        message: 'Consulta gratuita já utilizada',
      },
      { status: 403 }
    )
  }

  /* ────────────────────────────────────────────────
   * 7️⃣ Busca na VIEW reputacao_agregada (CORRIGIDO)
   * ──────────────────────────────────────────────── */
  let query = supabaseAdmin
    .from('reputacao_agregada')
    .select(`
      male_profile_id,
      display_name,
      city,
      state,
      country,
      total_avaliacoes,
      media_geral,
      confiabilidade_percentual
    `)

  if (nome) {
    query = query.ilike('display_name', `%${nome}%`)
  }

  if (cidade) {
    query = query.ilike('city', `%${cidade}%`)
  }

  const { data, error } = await query.limit(DEFAULT_LIMIT)

  if (error) {
    console.error('Erro ao buscar reputação', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reputação' },
      { status: 500 }
    )
  }

  /* ────────────────────────────────────────────────
   * 8️⃣ Incrementa uso FREE
   * ──────────────────────────────────────────────── */
  if (isFree) {
    await supabaseAdmin
      .from('profiles')
      .update({
        free_queries_used: (profile.free_queries_used ?? 0) + 1,
      })
      .eq('id', user.id)
  }

  /* ────────────────────────────────────────────────
   * 9️⃣ Tracking: resultado exibido
   * ──────────────────────────────────────────────── */
  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'view_result_summary',
    metadata: {
      results_count: data?.length ?? 0,
    },
  })

  /* ────────────────────────────────────────────────
   * 🔟 Retorno
   * ──────────────────────────────────────────────── */
  return NextResponse.json({
    allowed: true,
    results: data ?? [],
  })
}
