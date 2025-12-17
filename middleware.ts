import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient as createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/onboarding',
  '/onboarding/selfie',
  '/verification-pending',
  '/auth/callback',
  '/api',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((route) =>
    route === '/api' ? pathname.startsWith(route) : pathname === route || pathname.startsWith(`${route}/`)
  )

  const supabase = createMiddlewareSupabaseClient({ req, res })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isPublic) {
    return res
  }

  if (!user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_url, selfie_verified, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.selfie_url) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/onboarding/selfie'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  if (!profile.selfie_verified) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/verification-pending'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  if (!profile.onboarding_completed) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/onboarding'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname === '/') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/home'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
