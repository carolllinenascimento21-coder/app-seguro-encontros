import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  /**
   * ======================================================
   * 1️⃣ ROTAS TOTALMENTE PÚBLICAS (NÃO TOCAR NO SUPABASE)
   * ======================================================
   */
  const PUBLIC_ROUTES = [
    '/',
    '/funil',
    '/login',
    '/register',
    '/planos',
    '/auth/callback',
  ]

  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Se for rota pública, deixa passar direto
  if (isPublicRoute) {
    return res
  }

  /**
   * ======================================================
   * 2️⃣ A PARTIR DAQUI, PODE CONSULTAR SESSÃO
   * ======================================================
   */
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  /**
   * ======================================================
   * 3️⃣ VISITANTE (SEM LOGIN)
   * ======================================================
   */
  if (!session) {
    // Bloqueia apenas áreas protegidas
    if (
      pathname.startsWith('/home') ||
      pathname.startsWith('/consultar-reputacao') ||
      pathname.startsWith('/avaliar') ||
      pathname.startsWith('/perfil')
    ) {
      return NextResponse.redirect(
        new URL('/login', req.url)
      )
    }

    return res
  }

  /**
   * ======================================================
   * 4️⃣ USUÁRIA LOGADA → CHECA ONBOARDING
   * ======================================================
   */
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  // Falha defensiva
  if (error || !profile) {
    return NextResponse.redirect(
      new URL('/login', req.url)
    )
  }

  /**
   * ======================================================
   * 5️⃣ ONBOARDING OBRIGATÓRIO
   * ======================================================
   */
  if (!profile.onboarding_completed) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(
        new URL('/onboarding', req.url)
      )
    }
    return res
  }

  /**
   * ======================================================
   * 6️⃣ EVITA VOLTAR PARA ONBOARDING
   * ======================================================
   */
  if (pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(
      new URL('/home', req.url)
    )
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
