import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CONSULTA_WINDOW_MINUTES = 10

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

  const avaliacaoId = params.id

  if (!avaliacaoId) {
    return NextResponse.json({ error: 'Avaliação inválida' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Erro ao validar plano do perfil', profileError)
    return NextResponse.json({ error: 'Erro ao validar acesso' }, { status: 500 })
  }

  if ((profile?.plan ?? 'free') === 'free') {
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
      return NextResponse.json({ error: 'Erro ao validar acesso' }, { status: 500 })
    }

    if (!consultas || consultas.length === 0) {
      return NextResponse.json({ allowed: false, reason: 'PAYWALL' }, { status: 200 })
    }
  }

  const visibilityFilter = `and(is_anonymous.eq.false,publica.eq.true),user_id.eq.${user.id}`

  const { data, error } = await supabaseAdmin
    .from('avaliacoes')
    .select('*')
    .eq('id', avaliacaoId)
    .or(visibilityFilter)
    .single()

  if (error) {
    console.error('Erro ao carregar avaliação', error)
    return NextResponse.json({ error: 'Erro ao carregar avaliação' }, { status: 500 })
  }

  return NextResponse.json({ allowed: true, data })
}
