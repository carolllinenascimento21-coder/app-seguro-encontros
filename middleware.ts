import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  /* ======================================
     ROTAS PÚBLICAS (NUNCA REDIRECIONAR)
  ====================================== */
  const PUBLIC_PATHS = [
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

  const isPublicRoute = PUBLIC_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isPublicRoute) {
    const response = NextResponse.next()
    response.headers.set('x-middleware-active', 'true')
    response.headers.set('x-middleware-path', pathname)

    if (pathname.startsWith('/funil')) {
      response.headers.set('x-funil-public', 'true')
    }

    return response
  }

  /* ======================================
     ROTAS QUE EXIGEM LOGIN
     (controle simples, sem Supabase ainda)
  ====================================== */
  const PROTECTED_PATHS = [
    '/consultar-reputacao',
    '/avaliar',
    '/alertas',
    '/perfil',
    '/minhas-avaliacoes',
    '/configuracoes',
  ]

  const isProtectedRoute = PROTECTED_PATHS.some(
    path => pathname.startsWith(path)
  )

  if (isProtectedRoute) {
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.headers.set('x-middleware-active', 'true')
    response.headers.set('x-middleware-path', pathname)
    response.headers.set('x-reason', 'login-required')
    return response
  }

  /* ======================================
     DEFAULT: NÃO REDIRECIONA À FORÇA
  ====================================== */
  const response = NextResponse.next()
  response.headers.set('x-middleware-active', 'true')
  response.headers.set('x-middleware-path', pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
