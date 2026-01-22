import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { ensureProfileForUser } from '@/lib/profile-utils'
import { isAuthSessionMissingError } from '@/lib/auth-session'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('middleware')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) return res

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const isAuthSessionMissing = isAuthSessionMissingError(sessionError)

  // 🔓 FUNIL — SEMPRE PÚBLICO PARA NÃO LOGADAS
  if (!session || isAuthSessionMissing) {
    if (pathname === '/funil' || pathname.startsWith('/funil/')) {
      return res
    }

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

    const isPublicRoute = PUBLIC_ROUTES.some(
      route => pathname === route || pathname.startsWith(`${route}/`)
    )

    if (!isPublicRoute && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    return res
  }

  // 👤 LOGADA
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (isAuthSessionMissingError(userError) || !user) return res

  // 🚫 LOGADA NÃO PODE ACESSAR FUNIL
  if (pathname === '/funil' || pathname.startsWith('/funil/')) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  if (pathname.startsWith('/api')) return res

  const isOnboardingRoute =
    pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  const { profile, error: profileError } = await ensureProfileForUser(
    supabase,
    user
  )

  if (profileError || !profile) return res

  const needsOnboarding = profile.onboarding_completed !== true

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
