import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { FREE_PLAN } from '@/lib/billing'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
} from '@/lib/env'

export async function GET() {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('api/me/entitlements')
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

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  const supabase = createRouteHandlerClient({ cookies })

  /* =========================
     AUTENTICAÇÃO
     ========================= */
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
    return NextResponse.json(
      { error: 'Erro ao carregar sessão' },
      { status: 401 }
    )
  }

  if (!session) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
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

  /* =========================
     ENTITLEMENTS (RPC)
     ========================= */
  const { data, error } = await supabase.rpc(
    'get_avaliacao_entitlements'
  )

  if (error || !data) {
    console.error('Erro ao carregar entitlements', error)
    return NextResponse.json(
      { error: 'Erro ao validar permissões' },
      { status: 500 }
    )
  }

  const entitlements = Array.isArray(data) ? data[0] : data

  /* =========================
     NORMALIZAÇÃO
     ========================= */
  const plan = entitlements.plan ?? FREE_PLAN
  const credits = Number(entitlements.credits ?? 0)
  const planExpiresAt = entitlements.plan_expires_at ?? null
  const hasActivePlan = Boolean(entitlements.has_active_plan)
  const canSubmit = Boolean(entitlements.can_submit)

  /* =========================
     BLOQUEIO (LÓGICA CORRETA)
     ========================= */
  let motivoBloqueio: 'sem_plano' | 'sem_creditos' | null = null

  if (!canSubmit) {
    if (credits <= 0) {
      motivoBloqueio = 'sem_creditos'
    } else if (!hasActivePlan) {
      motivoBloqueio = 'sem_plano'
    }
  }

  /* =========================
     RESPONSE FINAL (TEA)
     ========================= */
  return NextResponse.json({
    plan,
    credits,
    plan_expires_at: planExpiresAt,
    has_active_plan: hasActivePlan,

    permissions: {
      can_submit_avaliacao: canSubmit,
      can_view_alerts: credits > 0,
      can_unlock_profile: credits > 0,
      has_premium_access: hasActivePlan,
    },

    bloqueio: {
      ativo: !canSubmit,
      motivo: motivoBloqueio,
    },
  })
}
