import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
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
