import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
} from '@/lib/env'

type ReviewRow = {
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
  relato: string | null
  flags_negative: string[] | null
  created_at: string | null
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
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

    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const supabase = await createServerClient()

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

    const resolvedParams = await Promise.resolve(context.params)
    const maleProfileId = resolvedParams?.id

    if (!maleProfileId) {
      return NextResponse.json(
        { error: 'Perfil inválido' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(
        'has_active_plan, current_plan_id, subscription_status, free_queries_used'
      )
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Erro ao validar plano', profileError)
      return NextResponse.json(
        { error: 'Erro ao validar acesso' },
        { status: 500 }
      )
    }

    const hasPaidSubscription =
      profile?.has_active_plan === true ||
      profile?.subscription_status === 'active' ||
      profile?.subscription_status === 'trialing' ||
      (typeof profile?.current_plan_id === 'string' &&
        profile.current_plan_id !== 'free')

    const freeQueriesUsed = profile?.free_queries_used ?? 0

    if (!hasPaidSubscription && freeQueriesUsed >= 3) {
      return NextResponse.json(
        { error: 'Acesso negado', reason: 'PAYWALL' },
        { status: 403 }
      )
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

    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('avaliacoes')
      .select(
        `
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          relato,
          flags_negative,
          created_at
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

    const safeReviews: ReviewRow[] = reviews ?? []
    const total = safeReviews.length

    let somaMedia = 0
    let somaTotalEstrelas = 0
    let alertCount = 0

    const medias = {
      comportamento: 0,
      seguranca_emocional: 0,
      respeito: 0,
      carater: 0,
      confianca: 0,
    }

    for (const r of safeReviews) {
      const comportamento = Number(r.comportamento ?? 0)
      const seguranca = Number(r.seguranca_emocional ?? 0)
      const respeito = Number(r.respeito ?? 0)
      const carater = Number(r.carater ?? 0)
      const confianca = Number(r.confianca ?? 0)

      medias.comportamento += comportamento
      medias.seguranca_emocional += seguranca
      medias.respeito += respeito
      medias.carater += carater
      medias.confianca += confianca

      const somaIndividual =
        comportamento + seguranca + respeito + carater + confianca

      somaTotalEstrelas += somaIndividual
      somaMedia += somaIndividual / 5

      if (Array.isArray(r.flags_negative) && r.flags_negative.length > 0) {
        alertCount++
      }
    }

    if (total > 0) {
      medias.comportamento /= total
      medias.seguranca_emocional /= total
      medias.respeito /= total
      medias.carater /= total
      medias.confianca /= total
    }

    const media = total > 0 ? somaMedia / total : 0
    const positivePercentage =
      total > 0 ? Math.round(((total - alertCount) / total) * 100) : 0

    let classificacao = 'sem-avaliacoes'

    if (total > 0) {
      if (alertCount > 0 || media < 2.5) classificacao = 'perigo'
      else if (media < 3.5) classificacao = 'atencao'
      else if (media < 4.5) classificacao = 'bom'
      else classificacao = 'excelente'
    }

    const relatos = safeReviews
      .filter((r) => typeof r.relato === 'string' && r.relato.trim().length > 0)
      .map((r) => ({
        relato: r.relato!.trim(),
        created_at: r.created_at,
      }))

    const response = {
      allowed: true,

      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city,
      },

      total,
      total_reviews: total,
      total_avaliacoes: total,

      media: Number(media.toFixed(2)),
      media_geral: Number(media.toFixed(2)),
      average_rating: Number(media.toFixed(2)),

      soma_total_estrelas: Number(somaTotalEstrelas.toFixed(2)),

      medias,
      medias_categoria: {
        comportamento: Number(medias.comportamento.toFixed(2)),
        seguranca_emocional: Number(medias.seguranca_emocional.toFixed(2)),
        respeito: Number(medias.respeito.toFixed(2)),
        carater: Number(medias.carater.toFixed(2)),
        confianca: Number(medias.confianca.toFixed(2)),
      },

      alertas: alertCount,
      alert_count: alertCount,

      classificacao,
      classification: classificacao,

      confiabilidade_percentual: positivePercentage,
      positive_percentage: positivePercentage,

      relatos,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro interno no endpoint de reputação', error)

    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
