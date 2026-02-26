// src/app/api/me/credits/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ balance: 0 })
  }

  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[me/credits] erro ao ler user_credits.balance:', error)
    return NextResponse.json({ balance: 0 })
  }

  return NextResponse.json({
    balance: data?.balance ?? 0,
  })
}
