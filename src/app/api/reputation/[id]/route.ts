import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const CONSULTA_WINDOW_MINUTES = 10

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // 🔹 Validar ENV público
  try {
    getSupabasePublicEnv('api/reputation/[id]')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  // 🔹 Validar ENV admin
  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  // 🔹 Cliente autenticado
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  const maleProfileId = params.id

  if (!maleProfileId) {
    return NextResponse.json(
      { error: 'Perfil inválido' },
      { status: 400 }
    )
  }

  // 🔹 Validar plano da usuária
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Erro ao validar plano do perfil', profileError)
    return NextResponse.json(
      { error: 'Erro ao validar acesso' },
      { status: 500 }
    )
  }

  const userPlan = profile?.plan ?? 'free'

  // 🔹 Se for free, validar janela de consulta
  if (userPlan === 'free') {
    const since = new Date(
      Date.now() - CONSULTA_WINDOW_MINUTES * 60 * 1000
    ).toISOString()

    const { data: consultas, error: consultasError } =
      await supabaseAdmin
        .from('consultas')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .limit(1)

    if (consultasError) {
      console.error('Erro ao validar consulta recente', consultasError)
      return NextResponse.json(
        { error: 'Erro ao validar acesso' },
        { status: 500 }
      )
    }

    if (!consultas || consultas.length === 0) {
      return NextResponse.json(
        { allowed: false, reason: 'PAYWALL' },
        { status: 200 }
      )
    }
  }

  // 🔹 Buscar perfil masculino
  const { data: maleProfile, error: maleProfileError } =
    await supabaseAdmin
      .from('male_profiles')
      .select('id, display_name, city')
      .eq('id', maleProfileId)
      .single()

  if (maleProfileError || !maleProfile) {
    return NextResponse.json(
      { error: 'Perfil não encontrado' },
      { status: 404 }
    )
  }

  // 🔹 Buscar avaliações públicas
  const { data: reviews, error: reviewsError } =
    await supabaseAdmin
      .from('avaliacoes')
      .select(`
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        relato,
        created_at
      `)
      .eq('male_profile_id', maleProfileId)
      .eq('publica', true)
      .order('created_at', { ascending: false })

  if (reviewsError) {
    console.error('Erro ao carregar avaliações', reviewsError)
    return NextResponse.json(
      { error: 'Erro ao carregar avaliações' },
      { status: 500 }
    )
  }

  const total = reviews?.length ?? 0

  let media = 0

  if (total > 0) {
    const soma = reviews.reduce((acc, r) => {
      const individual =
        (r.comportamento +
          r.seguranca_emocional +
          r.respeito +
          r.carater +
          r.confianca) / 5

      return acc + individual
    }, 0)

    media = soma / total
  }

  return NextResponse.json({
    allowed: true,
    profile: {
      id: maleProfile.id,
      display_name: maleProfile.display_name,
      city: maleProfile.city,
    },
    total,
    media: Number(media.toFixed(2)),
    relatos:
      reviews?.map((r) => ({
        relato: r.relato,
        created_at: r.created_at,
      })) ?? [],
  })
}
