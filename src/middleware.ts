import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { pathname } = req.nextUrl

  // 1️⃣ ROTA RAIZ → SEMPRE ONBOARDING
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // 2️⃣ ROTAS DE FLUXO DE SELFIE (permitidas se logada)
  const SELFIE_FLOW_ROUTES = [
    '/onboarding/selfie',
    '/verification-pending',
    '/verificacao-selfie',
  ]

  // 3️⃣ ROTAS PROTEGIDAS (exigem login)
  const PROTECTED_ROUTES = ['/perfil', '/avaliar']

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 4️⃣ NÃO LOGADA → só pode ver públicas
  if (!session) {
    if (
      SELFIE_FLOW_ROUTES.some(r => pathname.startsWith(r)) ||
      PROTECTED_ROUTES.some(r => pathname.startsWith(r))
    ) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  }

  // 5️⃣ LOGADA → bloqueia login/signup
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
