import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC_ROUTES = ['/login', '/signup', '/auth/callback']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/')

  if (isPublicRoute) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const redirectTo = (path: string) => {
    if (pathname === path) {
      return res
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = path
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  if (!user) {
    return redirectTo('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_url, selfie_verified, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return redirectTo('/onboarding/selfie')
  }

  if (!profile.selfie_url) {
    return redirectTo('/onboarding/selfie')
  }

  if (!profile.selfie_verified) {
    return redirectTo('/verification-pending')
  }

  if (!profile.onboarding_completed) {
    return redirectTo('/onboarding')
  }
if (pathname === '/home') {
  return res
}
  return redirectTo('/home')
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
