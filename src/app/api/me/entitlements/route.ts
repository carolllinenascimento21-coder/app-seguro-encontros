import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { FREE_PLAN } from '@/lib/billing'

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

  const { data, error } = await supabase.rpc('get_avaliacao_entitlements')

  const entitlements = Array.isArray(data) ? data[0] : data

  if (error || !entitlements) {
    console.error('Erro ao carregar entitlements', error)
    return NextResponse.json({ error: 'Erro ao validar permissões' }, { status: 500 })
  }

  const plan = entitlements.plan ?? FREE_PLAN
  const credits = entitlements.credits ?? 0
  const planExpiresAt = entitlements.plan_expires_at
  const hasActivePlan = entitlements.has_active_plan ?? false
  const canSubmit = entitlements.can_submit ?? false

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
