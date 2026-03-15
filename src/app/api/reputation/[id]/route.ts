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

    // 🔹 validar ENV público
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

    // 🔹 cliente admin
    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    // 🔹 cliente autenticado
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

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const {
      data: { user },
      error: authError
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

    // 🔹 validar plano
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

    // 🔹 buscar perfil
    const { data: maleProfile, error: maleProfileError } =
      await supabaseAdmin
        .from('male_profiles')
        .select('id,display_name,city')
        .eq('id', maleProfileId)
        .single()

    if (maleProfileError || !maleProfile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // 🔹 buscar avaliações
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
          flags_negative,
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

    let somaMedia = 0

    const medias = {
      comportamento: 0,
      seguranca_emocional: 0,
      respeito: 0,
      carater: 0,
      confianca: 0
    }

    let alertCount = 0

    if (total > 0) {

      reviews.forEach((r) => {

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

        if (r.flags_negative && r.flags_negative.length > 0) {
          alertCount++
        }

      })

      medias.comportamento /= total
      medias.seguranca_emocional /= total
      medias.respeito /= total
      medias.carater /= total
      medias.confianca /= total
    }

    const media = total > 0 ? somaMedia / total : 0

    // 🔹 classificação
    let classificacao = 'sem-avaliacoes'

    if (total > 0) {
      if (alertCount > 0 || media < 2.5) classificacao = 'perigo'
      else if (media < 3.5) classificacao = 'atencao'
      else if (media < 4.5) classificacao = 'bom'
      else classificacao = 'excelente'
    }

    return NextResponse.json({
      allowed: true,

      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city
      },

      total_reviews: total,

      media: Number(media.toFixed(2)),

      medias_categoria: {
        comportamento: Number(medias.comportamento.toFixed(2)),
        seguranca_emocional: Number(medias.seguranca_emocional.toFixed(2)),
        respeito: Number(medias.respeito.toFixed(2)),
        carater: Number(medias.carater.toFixed(2)),
        confianca: Number(medias.confianca.toFixed(2))
      },

      alertas: alertCount,

      classificacao,

      relatos:
        reviews
          ?.filter((r) => r.relato)
          .map((r) => ({
            relato: r.relato,
            created_at: r.created_at
          })) ?? []

    })

  } catch (error) {

    console.error('Erro interno no endpoint de reputação', error)

    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
