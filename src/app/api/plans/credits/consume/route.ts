import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  let body: { reason?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Payload inválido' },
      { status: 400 }
    )
  }

  const reason = (body.reason || 'manual_consume').trim()

  if (!reason) {
    return NextResponse.json(
      { error: 'Motivo inválido para consumo de crédito' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc('consume_credit_for_action', {
    user_uuid: user.id,
    action: reason,
  })

  if (error) {
    const message = String(error.message || '')
    const status = message.includes('PAYWALL') ? 402 : 400
    return NextResponse.json(
      { error: message },
      { status }
    )
  }

  return NextResponse.json({ success: true, data })
}
