import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  const PUBLIC_ROUTES = ['/', '/onboarding', '/login', '/signup']
  const SELFIE_ROUTE = '/onboarding/selfie'
  const SELFIE_FLOW_ROUTES = ['/verification-pending', '/verificacao-selfie']
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/auth')
  const isSelfieRoute =
    pathname === SELFIE_ROUTE || pathname.startsWith(`${SELFIE_ROUTE}/`)
  const isSelfieFlowRoute =
    isSelfieRoute ||
    SELFIE_FLOW_ROUTES.some(
      route => pathname === route || pathname.startsWith(`${route}/`)
    )

  if (!session?.user) {
    if (!isPublicRoute || isSelfieRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .single()

  const selfieVerified = profile?.selfie_verified === true

  if (!selfieVerified) {
    if (isSelfieFlowRoute) {
      return res
    }

    if (pathname === '/onboarding') {
      return NextResponse.redirect(new URL(SELFIE_ROUTE, req.url))
    }

    if (!isPublicRoute) {
      return NextResponse.redirect(new URL(SELFIE_ROUTE, req.url))
    }
  }

  if (selfieVerified && isSelfieRoute) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  if (selfieVerified && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
