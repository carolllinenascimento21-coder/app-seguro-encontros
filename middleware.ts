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

  /**
   * ======================================================
   * 1️⃣ ROTAS PÚBLICAS (NUNCA REDIRECIONAR)
   * ======================================================
   */
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/register',
    '/funil',
    '/planos',
  ]

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  /**
   * ======================================================
   * 2️⃣ VISITANTE (SEM LOGIN)
   * ======================================================
   */
  if (!session) {
    // 🔐 Bloqueia áreas protegidas
    if (
      pathname.startsWith('/consultar-reputacao') ||
      pathname.startsWith('/avaliar') ||
      pathname.startsWith('/perfil')
    ) {
      return NextResponse.redirect(
        new URL('/login', req.url)
      )
    }

    // ✅ Funil e páginas públicas liberadas
    return res
  }

  /**
   * ======================================================
   * 3️⃣ USUÁRIA AUTENTICADA → BUSCA PROFILE
   * ======================================================
   */
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    // Segurança defensiva
    return NextResponse.redirect(
      new URL('/login', req.url)
    )
  }

  /**
   * ======================================================
   * 4️⃣ ONBOARDING OBRIGATÓRIO
   * ======================================================
   */
  if (!profile.onboarding_completed) {
    // Usuária autenticada SEM onboarding
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(
        new URL('/onboarding', req.url)
      )
    }

    return res
  }

  /**
   * ======================================================
   * 5️⃣ USUÁRIA OK (LOGADA + ONBOARDING FEITO)
   * ======================================================
   */
  // Evita voltar para onboarding depois de concluído
  if (pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(
      new URL('/home', req.url)
    )
  }

  return res
}

/**
 * ======================================================
 * 6️⃣ MATCHER — APLICAÇÃO DO MIDDLEWARE
 * ======================================================
 */
export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
