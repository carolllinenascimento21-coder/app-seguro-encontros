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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('free_queries_used, current_plan_id, subscription_status')
      .eq('id', user.id)
      .single()

    const isPaid =
      profile?.subscription_status === 'active' ||
      profile?.subscription_status === 'trialing' ||
      (profile?.current_plan_id && profile.current_plan_id !== 'free')

    const freeQueriesUsed = profile?.free_queries_used ?? 0

    if (!isPaid && freeQueriesUsed >= 3) {
      return NextResponse.json(
        { success: false, reason: 'PAYWALL' },
        { status: 403 }
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
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    /**
     * IMPORTANTE
     * agora usando a view nova corrigida
     */
    let query = supabaseAdmin
      .from('male_profile_reputation_summary_v2')
      .select(
        'male_profile_id, name, city, average_rating, total_reviews, positive_percentage, alert_count, classification'
      )

    if (nome) query = query.ilike('name', `%${nome}%`)
    if (cidade) query = query.ilike('city', `%${cidade}%`)

    const { data, error } = await query
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(30)

    if (error) {
      throw error
    }

    /**
     * contabiliza consulta gratuita
     */
    if (!isPaid) {
      await supabaseAdmin
        .from('profiles')
        .update({
          free_queries_used: freeQueriesUsed + 1,
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      results: data ?? [],
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Erro interno no servidor'

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    )
  }
}
