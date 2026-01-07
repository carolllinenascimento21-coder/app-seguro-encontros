import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { pathname } = req.nextUrl

  const PUBLIC_ROUTES = ['/', '/onboarding', '/login', '/signup']
  const SELFIE_FLOW_ROUTES = [
    '/onboarding/selfie',
    '/verification-pending',
    '/verificacao-selfie',
  ]

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 4️⃣ NÃO LOGADA → só pode ver públicas
  if (!session) {
    const isPublicRoute = PUBLIC_ROUTES.some(
      r => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  }

  // 5️⃣ LOGADA → bloqueia login/signup
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  if (pathname.startsWith('/api')) {
    return res
  }

  const isSelfieFlowRoute = SELFIE_FLOW_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, onboarding_completed, selfie_verified')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return res
  }

  const needsOnboarding =
    (profile.onboarding_completed === false ||
      profile.onboarding_completed === null) &&
    (profile.selfie_verified === false || profile.selfie_verified === null)

  if (needsOnboarding && !isSelfieFlowRoute) {
    return NextResponse.redirect(new URL('/onboarding/selfie', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
