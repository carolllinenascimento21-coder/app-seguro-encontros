import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const publicRoutes = ['/login', '/signup', '/auth/callback']
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith('/_next')

  if (isPublicRoute) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.delete('next')
    return NextResponse.redirect(redirectUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_url, selfie_verified, onboarding_completed')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile) {
    if (pathname !== '/onboarding/selfie') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/onboarding/selfie'
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  if (!profile.selfie_url) {
    if (pathname !== '/onboarding/selfie') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/onboarding/selfie'
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  if (!profile.selfie_verified) {
    if (pathname !== '/verification-pending') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/verification-pending'
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  if (!profile.onboarding_completed) {
    if (pathname !== '/onboarding') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/onboarding'
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  if (pathname !== '/home') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/home'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
