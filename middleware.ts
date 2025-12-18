import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC_ROUTES = [
  '/',
  '/onboarding',
  '/onboarding/aceitar-termos',
  '/login',
  '/signup',
  '/auth/callback',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect(req, '/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return redirect(req, '/onboarding')
  }

  if (!profile.termos_aceitos) {
    return redirect(req, '/onboarding/aceitar-termos')
  }

  if (!profile.onboarding_completed) {
    return redirect(req, '/onboarding')
  }

  if (!profile.selfie_verified) {
    return redirect(req, '/verification-pending')
  }

  return res
}

function redirect(req: NextRequest, path: string) {
  if (req.nextUrl.pathname === path) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
