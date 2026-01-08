import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { FREE_PLAN } from '@/lib/billing'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const isPlanActive = (
  plan: string | null | undefined,
  planExpiresAt: string | null | undefined
) => {
  if (!plan || plan === FREE_PLAN) return false
  if (!planExpiresAt) return true
  return new Date(planExpiresAt).getTime() > Date.now()
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
    return NextResponse.json({ error: 'Erro ao carregar sessão' }, { status: 401 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError?.code === 'AuthSessionMissingError' || authError || !user) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan, credits, plan_expires_at')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    console.error('Erro ao carregar entitlements', error)
    return NextResponse.json({ error: 'Erro ao validar permissões' }, { status: 500 })
  }

  const plan = data.plan ?? FREE_PLAN
  const credits = data.credits ?? 0
  const planExpiresAt = data.plan_expires_at
  const hasActivePlan = isPlanActive(plan, planExpiresAt)
  const canSubmit = hasActivePlan || credits > 0

  let motivoBloqueio: 'sem_plano' | 'sem_creditos' | null = null
  if (!canSubmit) {
    motivoBloqueio = plan === FREE_PLAN ? 'sem_creditos' : 'sem_plano'
  }

  return NextResponse.json({
    can_submit_avaliacao: canSubmit,
    motivo_bloqueio: motivoBloqueio,
    plan,
    credits,
    plan_expires_at: planExpiresAt,
  })
}
