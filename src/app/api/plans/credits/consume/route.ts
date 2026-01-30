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

  let body: { amount: number; reason: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Payload inválido' },
      { status: 400 }
    )
  }

  const { amount, reason } = body

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Quantidade de créditos inválida' },
      { status: 400 }
    )
  }

  // chama função SQL segura
  const { error } = await supabase.rpc('consume_credit', {
    p_user_id: user.id,
    p_amount: amount,
    p_description: reason ?? 'Consumo de crédito',
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 402 } // pagamento requerido
    )
  }

  return NextResponse.json({ success: true })
}
