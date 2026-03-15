import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {

    try {
      getSupabasePublicEnv('api/reputation/[id]')
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

    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {}
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
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

    // validar plano
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('has_active_plan,current_plan_id,subscription_status,free_queries_used')
      .eq('id', user.id)
      .maybeSingle()

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

    // buscar perfil
    const { data: maleProfile } =
      await supabaseAdmin
        .from('male_profiles')
        .select('id,display_name,city')
        .eq('id', maleProfileId)
        .single()

    if (!maleProfile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // buscar avaliações
    const { data: reviews, error: reviewsError } =
      await supabaseAdmin
        .from('avaliacoes')
        .select(`
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          notas,
          flags_negative,
          created_at
        `)
        .eq('male_profile_id', maleProfileId)
        .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error(reviewsError)

      return NextResponse.json(
        { error: 'Erro ao carregar avaliações' },
        { status: 500 }
      )
    }

    const total = reviews?.length ?? 0

    let somaMedia = 0

    const medias = {
      comportamento: 0,
      seguranca_emocional: 0,
      respeito: 0,
      carater: 0,
      confianca: 0
    }

    let alertCount = 0

    reviews?.forEach((r) => {

      const comportamento = r.comportamento ?? 0
      const seguranca = r.seguranca_emocional ?? 0
      const respeito = r.respeito ?? 0
      const carater = r.carater ?? 0
      const confianca = r.confianca ?? 0

      medias.comportamento += comportamento
      medias.seguranca_emocional += seguranca
      medias.respeito += respeito
      medias.carater += carater
      medias.confianca += confianca

      const mediaIndividual =
        (comportamento +
          seguranca +
          respeito +
          carater +
          confianca) / 5

      somaMedia += mediaIndividual

      if (r.flags_negative?.length) {
        alertCount++
      }

    })

    if (total > 0) {
      medias.comportamento /= total
      medias.seguranca_emocional /= total
      medias.respeito /= total
      medias.carater /= total
      medias.confianca /= total
    }

    const media = total > 0 ? somaMedia / total : 0

    let classificacao = 'sem-avaliacoes'

    if (total > 0) {
      if (alertCount > 0 || media < 2.5) classificacao = 'perigo'
      else if (media < 3.5) classificacao = 'atencao'
      else if (media < 4.5) classificacao = 'bom'
      else classificacao = 'excelente'
    }

    const relatos =
      reviews
        ?.filter((r) => r.notas)
        .map((r) => ({
          relato: r.notas,
          created_at: r.created_at
        })) ?? []

    return NextResponse.json({

      allowed: true,

      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city
      },

      // formatos duplicados para compatibilidade
      total,
      total_reviews: total,

      media,
      average: media,

      medias,
      medias_categoria: medias,

      alertas: alertCount,
      alerts: alertCount,

      classificacao,
      classification: classificacao,

      relatos,
      reviews: relatos

    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
