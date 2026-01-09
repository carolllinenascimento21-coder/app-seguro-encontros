import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function POST(req: Request) {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/consume-query')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin não configurado' },
      { status: 503 }
    )
  }

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
    console.error('Erro ao ler payload de consume-query', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body.userId || body.userId !== user.id) {
    return NextResponse.json({ error: 'Usuária inválida' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin.rpc('consume_query', { user_uuid: body.userId })

  if (error) {
    const message = error?.message ?? ''
    console.error('Erro ao consumir consulta', error)
    if (message.includes('PAYWALL')) {
      return NextResponse.json({ success: false, reason: 'PAYWALL' }, { status: 200 })
    }
    return NextResponse.json({ error: 'Erro ao consumir consulta' }, { status: 500 })
  }

  return NextResponse.json({ success: true, state: data })
}
