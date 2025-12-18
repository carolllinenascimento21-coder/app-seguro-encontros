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
  '/verification-pending',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Assets e APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return res
  }

  // Rotas públicas
  if (PUBLIC_ROUTES.includes(pathname)) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Usuária não logada
  if (!user) {
    return redirect(req, '/login')
  }

  // Email ainda não confirmado
  if (!user.email_confirmed_at) {
    if (pathname !== '/verification-pending') {
      return redirect(req, '/verification-pending')
    }
    return res
  }

  // Buscar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('termos_aceitos')
    .eq('id', user.id)
    .maybeSingle()

  // Perfil ainda não criado (edge case)
  if (!profile) {
    return redirect(req, '/onboarding/aceitar-termos')
  }

  // Termos obrigatórios
  if (!profile.termos_aceitos) {
    if (!pathname.startsWith('/onboarding/aceitar-termos')) {
      return redirect(req, '/onboarding/aceitar-termos?next=/home')
    }
    return res
  }

  // Tudo certo → acesso liberado
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
  matcher: ['/((?!_next/static|_next/image).*)'],
}
