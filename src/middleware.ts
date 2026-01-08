import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { ensureProfileForUser } from '@/lib/profile-utils'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

  if (!supabaseUrl || !supabaseAnonKey) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const isAuthSessionMissing =
    sessionError?.code === 'AuthSessionMissingError'

  if (!session || isAuthSessionMissing) {
    return res
  }

  if (sessionError) {
    console.error('Erro ao carregar sessão no middleware:', sessionError)
    return res
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError?.code === 'AuthSessionMissingError' || !user) {
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
