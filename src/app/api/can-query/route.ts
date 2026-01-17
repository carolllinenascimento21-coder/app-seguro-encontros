import { NextResponse } from 'next/server'

import { FREE_PLAN } from '@/lib/billing'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export async function POST(req: Request) {
  let supabaseAdmin

  try {
    supabaseAdmin = getSupabaseAdminClient()
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

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  /**
   * 🔓 CASO 1 — Consulta pública (não logada)
   * /consultar-reputacao
   */
  if (!body?.userId) {
    return NextResponse.json({
      allowed: true,
      public: true,
    })
  }

  /**
   * 🔐 CASO 2 — Usuária logada (controle de plano/créditos)
   */
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan, free_queries_used, credits')
    .eq('id', body.userId)
    .single()

  if (error || !data) {
    console.error('Erro ao buscar perfil para can-query', error)
    return NextResponse.json(
      { error: 'Erro ao validar acesso' },
      { status: 500 }
    )
  }

  const profile = {
    plan: data.plan ?? FREE_PLAN,
    freeQueriesUsed: data.free_queries_used ?? 0,
    credits: data.credits ?? 0,
  }

  const allowed =
    profile.plan !== FREE_PLAN ||
    profile.freeQueriesUsed < 3 ||
    profile.credits > 0

  if (!allowed) {
    return NextResponse.json(
      { allowed: false, reason: 'PAYWALL', profile },
      { status: 200 }
    )
  }

  return NextResponse.json({ allowed: true, profile })
}
