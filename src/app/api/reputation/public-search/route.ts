import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const MAX_TERM_LENGTH = 80
const MAX_RESULTS = 10

function normalize(value: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Serviço temporariamente indisponível' },
        { status: 503 }
      )
    }

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
        { success: false, message: 'Informe nome ou cidade para consultar' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('male_profiles')
      .select('id, display_name, city')

    if (nome) query = query.ilike('normalized_name', `%${nome}%`)
    if (cidade) query = query.ilike('normalized_city', `%${cidade}%`)

    const { data: profiles, error: profilesError } = await query.limit(MAX_RESULTS)

    if (profilesError) {
      throw new Error(profilesError.message)
    }

    const profileIds = (profiles ?? []).map((profile) => profile.id)

    let summaryMap = new Map<
      string,
      {
        total_reviews: number
        average_rating: number
        alert_count: number
        classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente'
      }
    >()

    if (profileIds.length > 0) {
      const { data: summaries, error: summariesError } = await supabaseAdmin
        .from('male_profile_reputation_summary')
        .select('male_profile_id, total_reviews, average_rating, alert_count, classification')
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
            classification: (item.classification ?? 'confiavel') as 'perigo' | 'atencao' | 'confiavel' | 'excelente',
          },
        ])
      )
    }

    return NextResponse.json({
      success: true,
      guest: true,
      results: (profiles ?? []).map((profile) => {
        const summary = summaryMap.get(profile.id)
        const totalReviews = Number(summary?.total_reviews ?? 0)
        const alertCount = Number(summary?.alert_count ?? 0)

        return {
          male_profile_id: profile.id,
          name: profile.display_name ?? 'Sem nome',
          city: profile.city ?? null,
          has_data: totalReviews > 0 || alertCount > 0,
          total_reviews: totalReviews,
          average_rating: Number(summary?.average_rating ?? 0),
          alert_count: alertCount,
          classification: (summary?.classification ?? 'confiavel') as 'perigo' | 'atencao' | 'confiavel' | 'excelente',
          locked: true,
        }
      }),
    })
  } catch (err: any) {
    console.error('Erro em /api/reputation/public-search:', err)

    return NextResponse.json(
      { success: false, message: err?.message || 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
