import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const alwaysAllowed = ['/splash', '/onboarding', '/aceitar-termos']
  if (alwaysAllowed.some((route) => pathname.startsWith(route))) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const onboardingCompleted =
    session?.user?.user_metadata?.onboarding_completed === true

  if (session?.user && onboardingCompleted && pathname === '/') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/home'
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname.startsWith('/perfil') || pathname.startsWith('/profile')) {
    if (!session?.user) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selfie_verified')
      .eq('id', session.user.id)
      .maybeSingle()

    const selfieVerified =
      profileError?.code === '42703'
        ? false
        : profile?.selfie_verified ?? false

    if (!selfieVerified) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/verificacao-selfie'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
