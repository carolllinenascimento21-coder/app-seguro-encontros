import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const publicPaths = [
    '/',
    '/funil',
    '/onboarding',
    '/login',
    '/signup',
    '/register',
    '/planos',
    '/plans',
    '/verification-pending',
    '/auth/callback',
    '/api',
  ]

  const isPublicRoute = publicPaths.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (pathname.startsWith('/funil')) {
    console.info('[middleware] funil público', pathname)
  }

  if (isPublicRoute) {
    const response = NextResponse.next()
    response.headers.set('x-middleware-active', 'true')
    response.headers.set('x-middleware-path', pathname)
    if (pathname.startsWith('/funil')) {
      response.headers.set('x-funil-public', 'true')
    }
    return response
  }

  // Todas as outras rotas vão para onboarding
  const redirectResponse = NextResponse.redirect(new URL('/onboarding', req.url))
  redirectResponse.headers.set('x-middleware-active', 'true')
  redirectResponse.headers.set('x-middleware-path', pathname)
  return redirectResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
