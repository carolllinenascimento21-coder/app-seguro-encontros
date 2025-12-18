import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC_ROUTES = [
  '/',
  '/onboarding',
  '/onboarding/aceitar-termos',
  '/login',
  '/signup',
  '/auth/callback',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Rotas públicas
  if (!profile.onboarding_completed && pathname.startsWith('/onboarding')) {
  return res
  }

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Não logado
  if (!user) {
    return redirect(req, '/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      selfie_url,
      selfie_verified,
      termos_aceitos,
      onboarding_completed
    `)
    .eq('id', user.id)
    .maybeSingle()

  // Perfil ainda não criado
  if (!profile) {
    return redirect(req, '/onboarding/selfie')
  }

  // Selfie obrigatória
  if (!profile.selfie_url) {
    return redirect(req, '/onboarding/selfie')
  }

  // Selfie em análise
  if (!profile.selfie_verified) {
    return redirect(req, '/verification-pending')
  }

  // 🔴 TERMOS (ESSENCIAL)
  if (!profile.termos_aceitos) {
    return redirect(req, '/onboarding/aceitar-termos')
  }

  // Onboarding geral
  if (!profile.onboarding_completed) {
    return redirect(req, '/onboarding')
  }

  // Tudo ok → deixa navegar
  return res
}

function redirect(req: NextRequest, path: string) {
  if (req.nextUrl.pathname === path) {
    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
