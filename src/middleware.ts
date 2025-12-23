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

  /* ===============================
     1️⃣ ROTA RAIZ → ONBOARDING
  =============================== */
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  /* ===============================
     2️⃣ ROTAS PÚBLICAS
  =============================== */
  const PUBLIC_ROUTES = [
    '/onboarding',
    '/login',
    '/signup',
  ]

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/auth')

  /* ===============================
     3️⃣ SELFIE (EXIGE LOGIN)
  =============================== */
  const isSelfieRoute =
    pathname === '/onboarding/selfie' ||
    pathname.startsWith('/onboarding/selfie/')

  /* ===============================
     4️⃣ USUÁRIA NÃO LOGADA
  =============================== */
  if (!session?.user) {
    if (isPublicRoute) {
      return res
    }

    // selfie sem login → login
    if (isSelfieRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // qualquer outra rota → login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  /* ===============================
     5️⃣ USUÁRIA LOGADA
  =============================== */
  // logada tentando acessar login/signup → onboarding
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
