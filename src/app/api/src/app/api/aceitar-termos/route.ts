import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
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
