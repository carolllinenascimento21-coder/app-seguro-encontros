import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { FREE_PLAN } from '@/lib/billing'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
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

  let body: { userId?: string }
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload de can-query', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body.userId || body.userId !== user.id) {
    return NextResponse.json({ error: 'Usuária inválida' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan, free_queries_used, credits')
    .eq('id', body.userId)
    .single()

  if (error || !data) {
    console.error('Erro ao buscar perfil para can-query', error)
    return NextResponse.json({ error: 'Erro ao validar acesso' }, { status: 500 })
  }

  const profile = {
    plan: data.plan ?? FREE_PLAN,
    freeQueriesUsed: data.free_queries_used ?? 0,
    credits: data.credits ?? 0,
  }

  const allowed =
    profile.plan !== FREE_PLAN || profile.freeQueriesUsed < 3 || profile.credits > 0

  if (!allowed) {
    return NextResponse.json(
      { allowed: false, reason: 'PAYWALL', profile },
      { status: 200 }
    )
  }

  return NextResponse.json({ allowed: true, profile })
}
