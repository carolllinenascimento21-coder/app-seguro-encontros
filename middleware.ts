import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/',
  '/funil',
  '/login',
  '/register',
  '/signup',
  '/cadastro',
  '/planos',
  '/plans',
  '/planos-publicos',
  '/onboarding',
  '/auth/callback',
  '/reset-password',
  '/update-password',
  '/verification-pending',
]

const PROTECTED_PATHS = [
  '/home',
  '/perfil',
  '/avaliar',
  '/consultar-reputacao',
  '/alertas',
  '/minhas-avaliacoes',
  '/configuracoes',
  '/rede-apoio',
  '/modo-seguro',
  '/comunidade',
  '/checkout',
  '/verificacao-selfie',
  '/verify-selfie',
]

const SELFIE_GATE_EXCEPTIONS = [
  '/verificacao-selfie',
  '/verify-selfie',
  '/auth/callback',
  '/login',
  '/reset-password',
  '/update-password',
]

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

function applyAuthCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const isPublicRoute = PUBLIC_PATHS.some((route) => pathMatches(pathname, route))
  const isProtectedRoute = PROTECTED_PATHS.some((route) => pathMatches(pathname, route))

  const response = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', `${pathname}${search}`)

    const redirect = NextResponse.redirect(loginUrl)
    applyAuthCookies(redirect, response)
    return redirect
  }

  if (!user) {
    return response
  }

  const shouldCheckSelfie =
    isProtectedRoute &&
    !SELFIE_GATE_EXCEPTIONS.some((route) => pathMatches(pathname, route))

  if (shouldCheckSelfie) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('selfie_verified, selfie_url')
      .eq('id', user.id)
      .maybeSingle()

    if (!error) {
      const hasVerifiedSelfie = Boolean(profile?.selfie_verified) && Boolean(profile?.selfie_url)
      if (!hasVerifiedSelfie) {
        const verifyUrl = new URL('/verify-selfie', req.url)
        verifyUrl.searchParams.set('next', `${pathname}${search}`)

        const redirect = NextResponse.redirect(verifyUrl)
        applyAuthCookies(redirect, response)
        return redirect
      }
    }
  }

  if (!isProtectedRoute && !isPublicRoute) {
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
