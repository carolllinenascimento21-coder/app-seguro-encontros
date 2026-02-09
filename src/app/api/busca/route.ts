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
        { success: false, error: envError.message },
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
      { success: false, error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  /* ────────────────────────────────────────────────
   * 3️⃣ Parâmetros
   * ──────────────────────────────────────────────── */
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')?.trim().toLowerCase() ?? ''
  const cidade = searchParams.get('cidade')?.trim().toLowerCase() ?? ''

  if (!nome && !cidade) {
    return NextResponse.json(
      { success: false, error: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  /* ────────────────────────────────────────────────
   * 4️⃣ Perfil da usuária
   * ──────────────────────────────────────────────── */
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('has_active_plan, current_plan_id, free_queries_used')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Erro ao carregar perfil', profileError)
    return NextResponse.json(
      { success: false, error: 'Erro ao validar perfil' },
      { status: 500 }
    )
  }

  const isFree =
    !profile.has_active_plan || profile.current_plan_id === 'free'

  /* ────────────────────────────────────────────────
   * 5️⃣ Tracking: tentativa
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
   * 6️⃣ Paywall FREE
   * ──────────────────────────────────────────────── */
  if (isFree && (profile.free_queries_used ?? 0) >= FREE_LIMIT) {
    await supabaseAdmin.from('analytics_events').insert({
      user_id: user.id,
      event_name: 'free_limit_reached',
      metadata: { location: 'api/busca' },
    })

    return NextResponse.json(
      {
        success: false,
        allowed: false,
        code: 'FREE_LIMIT_REACHED',
        message: 'Consulta gratuita já utilizada',
      },
      { status: 403 }
    )
  }

  /* ────────────────────────────────────────────────
   * 7️⃣ Busca na tabela avaliados + avaliações públicas
   * ──────────────────────────────────────────────── */
  let query = supabaseAdmin
    .from('avaliados')
    .select(
      `
      id,
      nome,
      cidade,
      avaliacoes!inner (
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative,
        publica
      )
    `
    )
    .eq('avaliacoes.publica', true)

  if (nome) query = query.ilike('nome', `%${nome}%`)
  if (cidade) query = query.ilike('cidade', `%${cidade}%`)

  const { data, error } = await query.limit(DEFAULT_LIMIT)

  if (error) {
    console.error('Erro ao buscar reputação', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar reputação',
        details: error.message,
      },
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
   * 9️⃣ Tracking: resultado
   * ──────────────────────────────────────────────── */
  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'view_result_summary',
    metadata: {
      results_count: data?.length ?? 0,
    },
  })

  /* ────────────────────────────────────────────────
   * 🔟 Retorno (NORMALIZADO PARA O FRONT)
   * ──────────────────────────────────────────────── */
  const results = (data ?? []).map((avaliado: any) => {
    const avaliacoes = Array.isArray(avaliado.avaliacoes)
      ? avaliado.avaliacoes
      : []
    const totalAvaliacoes = avaliacoes.length
    const soma = avaliacoes.reduce((acc: number, a: any) => {
      const media =
        (a.comportamento +
          a.seguranca_emocional +
          a.respeito +
          a.carater +
          a.confianca) /
        5
      return acc + media
    }, 0)
    const flagsPositive = new Set<string>()
    const flagsNegative = new Set<string>()
    avaliacoes.forEach((a: any) => {
      a.flags_positive?.forEach((f: string) => flagsPositive.add(f))
      a.flags_negative?.forEach((f: string) => flagsNegative.add(f))
    })

    return {
      id: avaliado.id,
      nome: avaliado.nome,
      cidade: avaliado.cidade,
      total_avaliacoes: totalAvaliacoes,
      media_geral:
        totalAvaliacoes > 0
          ? Number((soma / totalAvaliacoes).toFixed(1))
          : 0,
      confiabilidade_percentual: Math.min(100, totalAvaliacoes * 10),
      flags_positive: Array.from(flagsPositive),
      flags_negative: Array.from(flagsNegative),
    }
  })

  return NextResponse.json({
    success: true,
    allowed: true,
    results,
  })
}
