import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20
const FREE_LIMIT = 1

function norm(s: string) {
  return (s ?? '').trim().toLowerCase()
}

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
  const termo = norm(searchParams.get('termo') ?? '')

  if (!termo) {
    return NextResponse.json(
      { success: false, error: 'Informe um nome ou cidade para buscar' },
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
      termo: !!termo,
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
   * 7️⃣ Busca em male_profiles (SEM JOIN)
   * ──────────────────────────────────────────────── */
  const searchFilter = [
    `normalized_name.ilike.%${termo}%`,
    `normalized_city.ilike.%${termo}%`,
    `display_name.ilike.%${termo}%`,
    `city.ilike.%${termo}%`,
  ].join(',')

  const { data: maleProfiles, error: mpError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('is_active', true)
    .or(searchFilter)
    .limit(DEFAULT_LIMIT)

  if (mpError) {
    console.error('Erro ao buscar male_profiles', mpError)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar reputação', details: mpError.message },
      { status: 500 }
    )
  }

  const ids = (maleProfiles ?? []).map((p) => p.id)

  /* ────────────────────────────────────────────────
   * 8️⃣ Busca avaliações públicas desses perfis (SEM JOIN)
   * ──────────────────────────────────────────────── */
  let avaliacoesByProfile: Record<string, any[]> = {}

  if (ids.length > 0) {
    const { data: avaliacoes, error: avError } = await supabaseAdmin
      .from('avaliacoes')
      .select(
        `
        male_profile_id,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative,
        publica
      `
      )
      .eq('publica', true)
      .in('male_profile_id', ids)

    if (avError) {
      console.error('Erro ao buscar avaliacoes', avError)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar reputação', details: avError.message },
        { status: 500 }
      )
    }

    avaliacoesByProfile = (avaliacoes ?? []).reduce((acc: any, a: any) => {
      const k = a.male_profile_id
      if (!k) return acc
      if (!acc[k]) acc[k] = []
      acc[k].push(a)
      return acc
    }, {})
  }

  /* ────────────────────────────────────────────────
   * 9️⃣ Incrementa uso FREE
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
   * 🔟 Normaliza retorno
   * ──────────────────────────────────────────────── */
  const results = (maleProfiles ?? []).map((p: any) => {
    const avaliacoes = avaliacoesByProfile[p.id] ?? []
    const totalAvaliacoes = avaliacoes.length

    const soma = avaliacoes.reduce((acc: number, a: any) => {
      const media =
        (Number(a.comportamento ?? 0) +
          Number(a.seguranca_emocional ?? 0) +
          Number(a.respeito ?? 0) +
          Number(a.carater ?? 0) +
          Number(a.confianca ?? 0)) / 5
      return acc + media
    }, 0)

    const flagsPositive = new Set<string>()
    const flagsNegative = new Set<string>()
    avaliacoes.forEach((a: any) => {
      a.flags_positive?.forEach((f: string) => flagsPositive.add(f))
      a.flags_negative?.forEach((f: string) => flagsNegative.add(f))
    })

    return {
      id: p.id,
      nome: p.display_name,
      cidade: p.city,
      total_avaliacoes: totalAvaliacoes,
      media_geral:
        totalAvaliacoes > 0 ? Number((soma / totalAvaliacoes).toFixed(1)) : 0,
      confiabilidade_percentual: Math.min(100, totalAvaliacoes * 10),
      flags_positive: Array.from(flagsPositive),
      flags_negative: Array.from(flagsNegative),
    }
  })

  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'view_result_summary',
    metadata: { results_count: results.length },
  })

  return NextResponse.json({ success: true, allowed: true, results })
}
