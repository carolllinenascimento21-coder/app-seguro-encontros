import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

type UserCreditsRow = {
  balance: number | null
}

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
    .maybeSingle<UserCreditsRow>()

  if (error) {
    console.error('[me/credits] erro ao ler user_credits.balance:', error)
    return NextResponse.json({ balance: 0 })
  }

  return NextResponse.json({ balance: data?.balance ?? 0 })
}
