import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'

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
      .select('current_plan_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Erro ao validar plano do perfil', profileError)
      return NextResponse.json(
        { error: 'Erro ao validar acesso', allowed: false },
        { status: 500 }
      )
    }

    const isPremiumUser = (profile?.current_plan_id ?? 'free') !== 'free'

    // 🔒 USUÁRIO FREE
    if (!isPremiumUser) {
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
