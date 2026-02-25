import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[me/credits] erro ao ler profiles.credits:', error)
    return NextResponse.json({ error: 'Erro ao carregar créditos' }, { status: 500 })
  }

  return NextResponse.json({ credits: data?.credits ?? 0 }, { status: 200 })
}
