import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const CONSULTA_WINDOW_MINUTES = 10

const CATEGORY_KEYS = [
  'comportamento',
  'seguranca_emocional',
  'respeito',
  'carater',
  'confianca',
] as const

type CategoryKey = (typeof CATEGORY_KEYS)[number]

type ReviewRow = {
  created_at: string
  rating: number | null
  review_text: string | null
  relato: string | null
  notas: string | null
  flags_negative: string[] | null
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
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

    if (userPlan === 'free') {
      const since = new Date(
        Date.now() - CONSULTA_WINDOW_MINUTES * 60 * 1000
      ).toISOString()

      const { data: consultas, error: consultasError } = await supabaseAdmin
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

    const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
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

    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('male_profile_reputation_summary')
      .select('average_rating, total_reviews, alert_count')
      .eq('male_profile_id', maleProfileId)
      .maybeSingle()

    if (summaryError) {
      console.error('Erro ao carregar resumo de reputação', summaryError)
      return NextResponse.json(
        { error: 'Erro ao carregar reputação' },
        { status: 500 }
      )
    }

    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('avaliacoes')
      .select(
        `
          created_at,
          rating,
          review_text,
          relato,
          notas,
          flags_negative,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca
        `
      )
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

    const reviewRows = (reviews ?? []) as ReviewRow[]

    const categoryTotals: Record<CategoryKey, { sum: number; count: number }> = {
      comportamento: { sum: 0, count: 0 },
      seguranca_emocional: { sum: 0, count: 0 },
      respeito: { sum: 0, count: 0 },
      carater: { sum: 0, count: 0 },
      confianca: { sum: 0, count: 0 },
    }

    for (const review of reviewRows) {
      for (const key of CATEGORY_KEYS) {
        const value = review[key]
        if (typeof value === 'number') {
          categoryTotals[key].sum += value
          categoryTotals[key].count += 1
        }
      }
    }

    const categoryAverages: Record<CategoryKey, number> = {
      comportamento: 0,
      seguranca_emocional: 0,
      respeito: 0,
      carater: 0,
      confianca: 0,
    }

    for (const key of CATEGORY_KEYS) {
      const { sum, count } = categoryTotals[key]
      categoryAverages[key] = count > 0 ? Number((sum / count).toFixed(1)) : 0
    }

    const reputation = {
      average_rating: Number(Number(summary?.average_rating ?? 0).toFixed(1)),
      total_reviews: Number(summary?.total_reviews ?? 0),
      alert_count: Number(summary?.alert_count ?? 0),
    }

    const normalizedReviews = reviewRows.map((review) => ({
      rating: Number(review.rating ?? 0),
      review_text: review.review_text ?? review.relato ?? review.notas ?? null,
      created_at: review.created_at,
      flags_negative: review.flags_negative ?? [],
    }))

    return NextResponse.json({
      allowed: true,
      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city,
      },
      reputation,
      category_averages: categoryAverages,
      reviews: normalizedReviews,
      // Compatibilidade retroativa com o formato antigo
      average_rating: reputation.average_rating,
      total_reviews: reputation.total_reviews,
      alerts: reputation.alert_count,
    })
  } catch (error) {
    console.error('Erro em /api/reputation/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
