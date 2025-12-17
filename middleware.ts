import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const publicRoutes = [
    '/splash',
    '/onboarding',
    '/aceitar-termos',
    '/verification-pending',
    '/auth/callback',
    '/login',
    '/cadastro',
    '/signup',
    '/verificacao-selfie',
  ]

  const isPublicRoute =
    pathname === '/' || publicRoutes.some((route) => pathname.startsWith(route))

  if (!session?.user) {
    if (isPublicRoute) {
      return res
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, selfie_verified, onboarding_completed, gender, selfie_url')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile) {
    const { data: createdProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: session.user.id,
          email: session.user.email,
          gender: session.user.user_metadata?.gender ?? null,
          selfie_url: null,
          selfie_verified: false,
          onboarding_completed: false,
        },
        { onConflict: 'id' }
      )
      .select('id, selfie_verified, onboarding_completed, gender, selfie_url')
      .maybeSingle()

    if (profileError) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('error', 'profile_init_failed')
      return NextResponse.redirect(redirectUrl)
    }

    profile = createdProfile ?? null
  }

  if (!profile) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const gender = profile?.gender?.toLowerCase()

  if (gender !== 'female') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'invalid_gender')
    return NextResponse.redirect(redirectUrl)
  }

  const onboardingCompleted = profile?.onboarding_completed === true

  if (!onboardingCompleted && !pathname.startsWith('/onboarding')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/onboarding'
    return NextResponse.redirect(redirectUrl)
  }

  const selfieVerified = profile?.selfie_verified === true

  if (!selfieVerified && !pathname.startsWith('/verification-pending')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/verification-pending'
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname === '/' || pathname === '/splash') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/home'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
