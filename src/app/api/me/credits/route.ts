import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type UserCreditsRow = {
  balance: number | null
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

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
