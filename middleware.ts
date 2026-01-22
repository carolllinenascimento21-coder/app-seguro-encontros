// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

import { ensureProfileForUser } from '@/lib/profile-utils'
import { isAuthSessionMissingError } from '@/lib/auth-session'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

/**
 * Regras (objetivo):
 * - /funil deve ser acessível para ANÔNIMAS (não redireciona para onboarding).
 * - Usuária logada:
 *    - se NÃO completou onboarding -> manda para /onboarding (exceto se já estiver lá)
 *    - se completou onboarding -> bloqueia /funil e manda para /home
 *
 * Ajuste o campo abaixo conforme seu schema:
 * - completed_onboarding / onboarded / onboarding_completed etc.
 */
function hasCompletedOnboarding(profile: any) {
  // tente cobrir nomes comuns sem quebrar:
  return Boolean(
    profile?.completed_onboarding ??
      profile?.onboarding_completed ??
      profile?.onboarded ??
      profile?.has_onboarded ??
      false
  )
}

export async function middleware(req: NextRequest) {
  // 1) Garantir env público do Supabase (para evitar 500 silencioso)
  try {
    getSupabasePublicEnv('middleware')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Rotas públicas (não exigem login)
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/funil') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset') ||
    pathname.startsWith('/api') || // APIs tratam auth por conta própria
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public')

  const supabase = createMiddlewareClient({ req, res })

  // 2) Pega sessão
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  // Se deu erro real (diferente do "sem sessão"), não quebra a navegação
  if (sessionError && !isAuthSessionMissingError(sessionError)) {
    console.error('middleware: erro ao carregar sessão', sessionError)
    return res
  }

  // 3) Usuária anônima
  if (!session) {
    // ✅ ANÔNIMA PODE VER O FUNIL
    if (pathname.startsWith('/funil')) return res

    // Protege rotas privadas: se não for pública, manda pro /funil
    if (!isPublic) {
      const url = req.nextUrl.clone()
      url.pathname = '/funil'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    return res
  }

  // 4) Usuária logada -> garantir user e perfil
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError && !isAuthSessionMissingError(userError)) {
    console.error('middleware: erro ao carregar user', userError)
    return res
  }
  if (!user) return res

  // ✅ garante perfil (contas antigas etc.)
  const { profile, error: profileError } = await ensureProfileForUser(supabase, user)
  if (profileError) {
    console.error('middleware: erro ensureProfileForUser', profileError)
    // não derruba navegação por isso
  }

  const completed = hasCompletedOnboarding(profile)

  // 5) Regras pós-login
  // Se NÃO completou onboarding, força /onboarding (exceto se já estiver lá)
  if (!completed) {
    if (!pathname.startsWith('/onboarding')) {
      const url = req.nextUrl.clone()
      url.pathname = '/onboarding'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    return res
  }

  // Se completou onboarding, bloqueia /funil
  if (pathname.startsWith('/funil')) {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return res
}

/**
 * Matcher: aplique em páginas, não em arquivos estáticos.
 * Se você tiver outras pastas públicas, inclua aqui.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
