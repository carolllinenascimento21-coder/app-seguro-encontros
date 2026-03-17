import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'

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

    const result = await getDetailedReputation(supabaseAdmin, maleProfileId)

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      allowed: true,
      ...result.data,
    })
  } catch (error) {
    console.error('Erro em /api/reputation/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    )
  }
}
