import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/verification-pending'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        new URL('/login?error=oauth_exchange_failed', requestUrl.origin)
      )
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const gender = session?.user?.user_metadata?.gender?.toLowerCase()

    if (!gender || gender !== 'female') {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(
          '/login?error=invalid_gender&message=Este%20aplicativo%20e%20exclusivo%20para%20mulheres',
          requestUrl.origin
        )
      )
    }

    const profilePayload = {
      id: session.user.id,
      email: session.user.email,
      name:
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        session.user.email,
      gender: 'female',
      selfie_verified: false,
    }

    await supabase.from('profiles').upsert(profilePayload)
  }

  const redirectUrl = new URL(next, requestUrl.origin)
  return NextResponse.redirect(redirectUrl)
}
