import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/',
  '/funil',
  '/onboarding',
  '/login',
  '/signup',
  '/register',
  '/planos',
  '/plans',
  '/verification-pending',
  '/auth/callback',
  '/api',
]

const PROTECTED_PATHS = [
  '/consultar-reputacao',
  '/avaliar',
  '/alertas',
  '/perfil',
  '/minhas-avaliacoes',
  '/configuracoes',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublicRoute = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isPublicRoute) {
    response.headers.set('x-middleware-active', 'true')
    response.headers.set('x-middleware-path', pathname)

    if (pathname.startsWith('/funil')) {
      response.headers.set('x-funil-public', 'true')
    }

    return response
  }

  const isProtectedRoute = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  )

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)

    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.headers.set('x-middleware-active', 'true')
    redirectResponse.headers.set('x-middleware-path', pathname)
    redirectResponse.headers.set('x-reason', 'login-required')
    return redirectResponse
  }

  response.headers.set('x-middleware-active', 'true')
  response.headers.set('x-middleware-path', pathname)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
