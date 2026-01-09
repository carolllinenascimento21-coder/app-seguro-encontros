import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function POST() {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/aceitar-termos')
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

  const supabase = createRouteHandlerClient({ cookies })

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
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError?.code === 'AuthSessionMissingError' || authError || !user) {
    return NextResponse.json(
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      termos_aceitos: true,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao salvar aceite dos termos' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
