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

  // 🔓 Rotas públicas
  const publicRoutes = [
    '/login',
    '/signup',
    '/onboarding',
    '/onboarding/selfie',
    '/auth/callback',
  ]

  if (!session?.user) {
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // 🔎 Busca perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .single()

  // 🚨 FORÇA SELFIE
  if (
    profile &&
    profile.selfie_verified === false &&
    pathname !== '/onboarding/selfie'
  ) {
    return NextResponse.redirect(
      new URL('/onboarding/selfie', req.url)
    )
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
