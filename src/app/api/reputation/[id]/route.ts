import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'
import {
  canUseFreeReputationQuery,
  hasPaidReputationAccess,
} from '@/lib/reputation/access-control'

type ProfileAccessRow = {
  plan: string | null
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS =
  'plan, has_active_plan, current_plan_id, subscription_status, free_queries_used'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } } // ✅ corrigido
) {
  try {
    const supabase = await createServerClient()
    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado', allowed: false },
        { status: 503 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuária não autenticada', allowed: false },
        { status: 401 }
      )
    }

    const maleProfileId = params.id // ✅ sem await

    if (!maleProfileId) {
      return NextResponse.json(
        { error: 'Perfil inválido', allowed: false },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_ACCESS_FIELDS)
      .eq('id', user.id)
      .maybeSingle<ProfileAccessRow>()

    if (profileError) {
      console.error('Erro ao validar plano do perfil', profileError)
      return NextResponse.json(
        { error: 'Erro ao validar acesso', allowed: false },
        { status: 500 }
      )
    }

    const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('id', maleProfileId)
      .maybeSingle()

    if (maleProfileError || !maleProfile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado', allowed: false },
        { status: 404 }
      )
    }

    const isPremiumUser = hasPaidReputationAccess(profile)
    let canViewFullReputation = isPremiumUser

    if (!isPremiumUser && canUseFreeReputationQuery(profile)) {
      const { error: consumeError } = await supabaseAdmin.rpc('consume_query', {
        user_uuid: user.id,
      })

      if (!consumeError) {
        canViewFullReputation = true
      } else if (!consumeError.message?.includes('PAYWALL')) {
        console.error('Erro ao consumir consulta gratuita de reputação', consumeError)
        return NextResponse.json(
          { error: 'Erro ao validar acesso', allowed: false },
          { status: 500 }
        )
      }
    }

    // 🔒 USUÁRIO FREE SEM CONSULTAS DISPONÍVEIS
    if (!canViewFullReputation) {
      const { data: summary, error: summaryError } = await supabaseAdmin
        .from('male_profile_reputation_summary')
        .select('total_reviews, alert_count')
        .eq('male_profile_id', maleProfileId)
        .maybeSingle()

      if (summaryError) {
        console.error('Erro ao validar resumo de reputação', summaryError)
        return NextResponse.json(
          { error: 'Erro ao validar reputação', allowed: false },
          { status: 500 }
        )
      }

      const hasData =
        Number(summary?.total_reviews ?? 0) > 0 ||
        Number(summary?.alert_count ?? 0) > 0

      return NextResponse.json({
        allowed: false, // ✅ PADRONIZAÇÃO
        locked: true,
        has_data: hasData,
      })
    }

    // 🔓 USUÁRIO PREMIUM
    const result = await getDetailedReputation(supabaseAdmin, maleProfileId)

    if (result.status !== 200) {
      console.error('Erro getDetailedReputation:', result)

      return NextResponse.json(
        {
          error: result.error || 'Erro ao carregar reputação',
          allowed: false,
        },
        { status: result.status }
      )
    }

    return NextResponse.json({
      allowed: true,
      ...(result.data || {}), // ✅ evita undefined
    })
  } catch (error) {
    console.error('Erro em /api/reputation/[id]:', error)

    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
        allowed: false,
      },
      { status: 500 }
    )
  }
}
