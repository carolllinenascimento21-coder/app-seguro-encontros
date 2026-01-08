import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST() {
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
