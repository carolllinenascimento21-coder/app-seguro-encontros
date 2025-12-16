import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const alwaysAllowed = [
    '/splash',
    '/onboarding',
    '/aceitar-termos',
    '/verification-pending',
    '/auth/callback',
    '/login',
    '/cadastro',
    '/signup',
  ]
  if (alwaysAllowed.some((route) => pathname.startsWith(route))) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified, gender')
    .eq('id', session.user.id)
    .maybeSingle()

  const gender = profile?.gender?.toLowerCase()

  if (gender !== 'female') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'invalid_gender')
    return NextResponse.redirect(redirectUrl)
  }

  const selfieVerified = profile?.selfie_verified ?? false
  if (!selfieVerified && !pathname.startsWith('/verification-pending')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/verification-pending'
    return NextResponse.redirect(redirectUrl)
  }

  const onboardingCompleted =
    session?.user?.user_metadata?.onboarding_completed === true

  if (!onboardingCompleted && !pathname.startsWith('/onboarding')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/onboarding'
    return NextResponse.redirect(redirectUrl)
  }

  if (session?.user && onboardingCompleted && pathname === '/') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/home'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
