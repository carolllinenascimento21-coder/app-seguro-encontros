import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const CONSULTA_WINDOW_MINUTES = 10

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
          id,
          relato,
          created_at,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          flags_negative
        `
      )
      .eq('male_profile_id', maleProfileId)
      .eq('publica', true)
      .eq('status', 'public')
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('Erro ao carregar avaliações', reviewsError)
      return NextResponse.json(
        { error: 'Erro ao carregar avaliações' },
        { status: 500 }
      )
    }

    const averageRating = Number(summary?.average_rating ?? 0)
    const totalReviews = Number(summary?.total_reviews ?? 0)
    const alertCount = Number(summary?.alert_count ?? 0)

    return NextResponse.json({
      allowed: true,
      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city,
      },
      average_rating: Number(averageRating.toFixed(1)),
      total_reviews: totalReviews,
      alerts: alertCount,
      reviews: (reviews ?? []).map((review) => ({
        id: review.id,
        relato: review.relato,
        created_at: review.created_at,
        comportamento: review.comportamento,
        seguranca_emocional: review.seguranca_emocional,
        respeito: review.respeito,
        carater: review.carater,
        confianca: review.confianca,
        flags_negative: review.flags_negative ?? [],
      })),
    })
  } catch (error) {
    console.error('Erro em /api/reputation/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
