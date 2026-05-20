import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import {
  canUseFreeReputationQuery,
  hasPaidReputationAccess,
} from '@/lib/reputation/access-control'

const MAX_TERM_LENGTH = 80

type ProfileAccessRow = {
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS =
  'has_active_plan, current_plan_id, subscription_status, free_queries_used'

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_ACCESS_FIELDS)
      .eq('id', user.id)
      .maybeSingle<ProfileAccessRow>()

    if (profileError) {
      throw new Error(profileError.message)
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const isPremiumUser = hasPaidReputationAccess(profile)

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

    if (!isPremiumUser && !canUseFreeReputationQuery(profile)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Limite de 3 consultas gratuitas atingido',
          reason: 'PAYWALL',
          free_queries_used: profile.free_queries_used ?? 0,
        },
        { status: 403 }
      )
    }

    let profilesQuery = supabaseAdmin
      .from('male_profiles')
      .select('id, display_name, city')

    if (nome) {
      profilesQuery = profilesQuery.ilike('normalized_name', `%${nome}%`)
    }

    if (cidade) {
      profilesQuery = profilesQuery.ilike('normalized_city', `%${cidade}%`)
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

    const results = (maleProfiles ?? []).map((profileItem) => {
      const summary = summaryMap.get(profileItem.id)
      const hasData = Number(summary?.total_reviews ?? 0) > 0 || Number(summary?.alert_count ?? 0) > 0

      return {
        male_profile_id: profileItem.id,
        name: profileItem.display_name ?? 'Sem nome',
        city: profileItem.city ?? null,
        average_rating: Number(summary?.average_rating ?? 0),
        total_reviews: Number(summary?.total_reviews ?? 0),
        positive_percentage: Number(summary?.positive_percentage ?? 0),
        alert_count: Number(summary?.alert_count ?? 0),
        classification: (summary?.classification ?? 'confiavel') as 'perigo' | 'atencao' | 'confiavel' | 'excelente',
        has_data: hasData,
        locked: false,
      }
    })

    return NextResponse.json({
      success: true,
      is_premium_user: isPremiumUser,
      free_queries_used: profile.free_queries_used ?? 0,
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
