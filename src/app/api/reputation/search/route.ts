import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const MAX_TERM_LENGTH = 80

function normalize(value: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizada' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('free_queries_used, current_plan_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error(profileError.message)
    }

    const isPaid =
      profile?.subscription_status === 'active' ||
      profile?.subscription_status === 'trialing' ||
      (profile?.current_plan_id && profile.current_plan_id !== 'free')

    const freeQueriesUsed = profile?.free_queries_used ?? 0

    const { searchParams } = new URL(req.url)

    const nomeRaw = searchParams.get('nome')
    const cidadeRaw = searchParams.get('cidade')

    if (
      (nomeRaw?.length ?? 0) > MAX_TERM_LENGTH ||
      (cidadeRaw?.length ?? 0) > MAX_TERM_LENGTH
    ) {
      return NextResponse.json(
        { success: false, message: 'Termo de busca muito longo' },
        { status: 400 }
      )
    }

    const nome = normalize(nomeRaw)
    const cidade = normalize(cidadeRaw)

    if (!nome && !cidade) {
      return NextResponse.json(
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    if (!isPaid && freeQueriesUsed >= 3) {
      let countQuery = supabaseAdmin
        .from('male_profiles')
        .select('*', { head: true, count: 'exact' })

      if (nome) {
        countQuery = countQuery.ilike('display_name', `%${nome}%`)
      }

      if (cidade) {
        countQuery = countQuery.ilike('city', `%${cidade}%`)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        throw new Error(countError.message)
      }

      const totalFound = count ?? 0

      return NextResponse.json(
        {
          success: false,
          reason: 'PAYWALL',
          total_found: totalFound,
          has_results: totalFound > 0,
          message:
            totalFound > 0
              ? `Encontramos ${totalFound} resultado(s). Assine para desbloquear os perfis.`
              : 'Assine um plano para continuar com consultas ilimitadas.',
        },
        { status: 403 }
      )
    }

    let profilesQuery = supabaseAdmin
      .from('male_profiles')
      .select('id, display_name, city')

    if (nome) {
      profilesQuery = profilesQuery.ilike('display_name', `%${nome}%`)
    }

    if (cidade) {
      profilesQuery = profilesQuery.ilike('city', `%${cidade}%`)
    }

    const { data: maleProfiles, error: maleProfilesError } = await profilesQuery.limit(30)

    if (maleProfilesError) {
      throw new Error(maleProfilesError.message)
    }

    const profileIds = (maleProfiles ?? []).map((p) => p.id)

    let summaryMap = new Map<
      string,
      {
        total_reviews: number
        average_rating: number
        alert_count: number
        positive_percentage: number
        classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente'
      }
    >()

    if (profileIds.length > 0) {
      const { data: summaries, error: summariesError } = await supabaseAdmin
        .from('male_profile_reputation_summary')
        .select('male_profile_id, total_reviews, average_rating, alert_count, positive_percentage, classification')
        .in('male_profile_id', profileIds)

      if (summariesError) {
        throw new Error(summariesError.message)
      }

      summaryMap = new Map(
        (summaries ?? []).map((item) => [
          item.male_profile_id,
          {
            total_reviews: Number(item.total_reviews ?? 0),
            average_rating: Number(item.average_rating ?? 0),
            alert_count: Number(item.alert_count ?? 0),
            positive_percentage: Number(item.positive_percentage ?? 0),
            classification: (item.classification ?? 'confiavel') as 'perigo' | 'atencao' | 'confiavel' | 'excelente',
          },
        ])
      )
    }

    const results = (maleProfiles ?? [])
      .map((profileItem) => {
        const summary = summaryMap.get(profileItem.id)

        const totalReviews = summary?.total_reviews ?? 0
        const averageRating = summary?.average_rating ?? 0
        const alertCount = summary?.alert_count ?? 0
        const positivePercentage = summary?.positive_percentage ?? 0
        const classification = summary?.classification ?? 'confiavel'

        return {
          male_profile_id: profileItem.id,
          name: profileItem.display_name ?? 'Sem nome',
          city: profileItem.city ?? null,
          average_rating: averageRating,
          total_reviews: totalReviews,
          positive_percentage: positivePercentage,
          alert_count: alertCount,
          classification,
        }
      })
      .sort((a, b) => {
        if (b.average_rating !== a.average_rating) {
          return b.average_rating - a.average_rating
        }
        return b.total_reviews - a.total_reviews
      })

    if (!isPaid) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          free_queries_used: freeQueriesUsed + 1,
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (err: any) {
    console.error('Erro em /api/reputation/search:', err)

    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Erro interno no servidor',
      },
      { status: 500 }
    )
  }
}
