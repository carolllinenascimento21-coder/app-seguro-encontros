import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { pathname } = req.nextUrl

  const PUBLIC_ROUTES = ['/onboarding', '/login', '/signup']

  // 1️⃣ ROTA RAIZ → SEMPRE ONBOARDING
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // 2️⃣ ROTAS DE FLUXO DE SELFIE (permitidas se logada)
  const SELFIE_FLOW_ROUTES = [
    '/onboarding/selfie',
    '/verification-pending',
    '/verificacao-selfie',
    '/api/verify-selfie',
  ]

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 4️⃣ NÃO LOGADA → só pode ver públicas
  if (!session) {
    const isSelfieFlowRoute = SELFIE_FLOW_ROUTES.some(r => pathname.startsWith(r))
    const isPublicRoute = PUBLIC_ROUTES.some(
      r => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (isSelfieFlowRoute || !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  }

  // 5️⃣ LOGADA → checa selfie no perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .single()

  const selfieVerified = Boolean(profile?.selfie_verified)

  // 6️⃣ SEM SELFIE → só pode ver fluxo de selfie
  const isSelfieFlow = SELFIE_FLOW_ROUTES.some(r => pathname.startsWith(r))
  if (!selfieVerified && !isSelfieFlow) {
    return NextResponse.redirect(new URL('/onboarding/selfie', req.url))
  }

  // 7️⃣ LOGADA → bloqueia login/signup
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(
      new URL(selfieVerified ? '/onboarding' : '/onboarding/selfie', req.url)
    )
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
