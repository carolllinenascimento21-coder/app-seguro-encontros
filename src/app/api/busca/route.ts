import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_LIMIT = 20
const FREE_LIMIT = 1

function norm(value: string) {
  return value.trim().toLowerCase()
}

export async function GET(req: Request) {
  // 1) Ambiente público
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

  // 2) Supabase
  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData?.user) {
    return NextResponse.json(
      { success: false, error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  const user = authData.user

  // 3) Parâmetros
  const { searchParams } = new URL(req.url)
  const nome = norm(searchParams.get('nome') ?? '')
  const cidade = norm(searchParams.get('cidade') ?? '')

  if (!nome && !cidade) {
    return NextResponse.json(
      { success: false, error: 'Informe nome ou cidade' },
      { status: 400 }
    )
  }

  // 4) Perfil da usuária (paywall)
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

  const isFree = !profile.has_active_plan || profile.current_plan_id === 'free'

  // 5) Tracking tentativa (não quebra request se falhar)
  supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'consult_basic',
    metadata: {
      nome: !!nome,
      cidade: !!cidade,
      plan: profile.current_plan_id ?? 'free',
    },
  }).catch(() => {})

  // 6) Paywall FREE
  if (isFree && (profile.free_queries_used ?? 0) >= FREE_LIMIT) {
    supabaseAdmin.from('analytics_events').insert({
      user_id: user.id,
      event_name: 'free_limit_reached',
      metadata: { location: 'api/busca' },
    }).catch(() => {})

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

  // 7) Busca perfis masculinos
  let mpQuery = supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .limit(DEFAULT_LIMIT)

  // Preferir buscar pelos normalizados quando der
  if (nome) {
    // busca por normalized_name contendo termo
    mpQuery = mpQuery.ilike('normalized_name', `%${nome}%`)
  }
  if (cidade) {
    mpQuery = mpQuery.ilike('normalized_city', `%${cidade}%`)
  }

  const { data: maleProfiles, error: mpError } = await mpQuery

  if (mpError) {
    console.error('Erro ao buscar male_profiles', mpError)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar reputação', details: mpError.message },
      { status: 500 }
    )
  }

  const ids = (maleProfiles ?? []).map((p) => p.id)

  if (ids.length === 0) {
    // incrementa FREE mesmo sem resultado (decisão de produto; se não quiser, remova)
    if (isFree) {
      await supabaseAdmin
        .from('profiles')
        .update({ free_queries_used: (profile.free_queries_used ?? 0) + 1 })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      allowed: true,
      results: [],
    })
  }

  // 8) Busca avaliações públicas para esses perfis
  const { data: avaliacoes, error: avError } = await supabaseAdmin
    .from('avaliacoes')
    .select(
      'id, male_profile_id, comportamento, seguranca_emocional, respeito, carater, confianca, flags_positive, flags_negative'
    )
    .in('male_profile_id', ids)
    .eq('publica', true)

  if (avError) {
    console.error('Erro ao buscar avaliacoes', avError)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar reputação', details: avError.message },
      { status: 500 }
    )
  }

  // 9) Agrega
  const byProfile = new Map<string, any[]>()
  for (const a of avaliacoes ?? []) {
    const key = a.male_profile_id
    if (!byProfile.has(key)) byProfile.set(key, [])
    byProfile.get(key)!.push(a)
  }

  const results = (maleProfiles ?? []).map((p) => {
    const list = byProfile.get(p.id) ?? []
    const total = list.length

    const flagsPositive = new Set<string>()
    const flagsNegative = new Set<string>()

    let sum = 0
    for (const a of list) {
      const media =
        (Number(a.comportamento ?? 0) +
          Number(a.seguranca_emocional ?? 0) +
          Number(a.respeito ?? 0) +
          Number(a.carater ?? 0) +
          Number(a.confianca ?? 0)) / 5

      sum += media

      if (Array.isArray(a.flags_positive)) {
        for (const f of a.flags_positive) if (typeof f === 'string') flagsPositive.add(f)
      }
      if (Array.isArray(a.flags_negative)) {
        for (const f of a.flags_negative) if (typeof f === 'string') flagsNegative.add(f)
      }
    }

    return {
      id: p.id,
      nome: p.display_name ?? '',
      cidade: p.city ?? '',
      total_avaliacoes: total,
      media_geral: total > 0 ? Number((sum / total).toFixed(1)) : 0,
      confiabilidade_percentual: Math.min(100, total * 10),
      flags_positive: Array.from(flagsPositive),
      flags_negative: Array.from(flagsNegative),
    }
  })

  // 10) Incrementa FREE
  if (isFree) {
    await supabaseAdmin
      .from('profiles')
      .update({ free_queries_used: (profile.free_queries_used ?? 0) + 1 })
      .eq('id', user.id)
  }

  // 11) Tracking resultado (não quebra request se falhar)
  supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'view_result_summary',
    metadata: { results_count: results.length },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    allowed: true,
    results,
  })
}
