import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { ensureProfileForUser } from '@/lib/profile-utils'
import { isAuthSessionMissingError } from '@/lib/auth-session'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('middleware')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  const { pathname } = req.nextUrl

  const PUBLIC_ROUTES = [
    '/',
    '/onboarding',
    '/login',
    '/signup',
    '/register',
    '/planos',
    '/plans',
    '/verification-pending',
    '/auth/callback',
  ]

  if (!supabaseEnv) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const isAuthSessionMissing = isAuthSessionMissingError(sessionError)

  if (sessionError && !isAuthSessionMissing) {
    console.error('Erro ao carregar sessão no middleware:', sessionError)
    return res
  }

  if (!session || isAuthSessionMissing) {
    const isPublicRoute = PUBLIC_ROUTES.some(
      route => pathname === route || pathname.startsWith(`${route}/`)
    )

    if (!isPublicRoute && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    return res
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (isAuthSessionMissingError(userError) || !user) {
    return res
  }

  // 5️⃣ LOGADA → bloqueia login/signup
  if (pathname.startsWith('/api')) {
    return res
  }

  const isOnboardingRoute =
    pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  const { profile, error: profileError } = await ensureProfileForUser(
    supabase,
    user
  )

  // ✅ Falhas técnicas não devem redirecionar (o guard exibe erro amigável).
  if (profileError || !profile) {
    return res
  }

  const needsOnboarding = profile.onboarding_completed !== true

  // 5️⃣ LOGADA → bloqueia login/signup/register quando já há sessão
  if (pathname === '/login' || pathname === '/signup' || pathname === '/register') {
    return NextResponse.redirect(
      new URL(needsOnboarding ? '/onboarding/selfie' : '/home', req.url)
    )
  }

  if (needsOnboarding && !isOnboardingRoute) {
    return NextResponse.redirect(new URL('/onboarding/selfie', req.url))
  }

  if (!needsOnboarding && isOnboardingRoute) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
