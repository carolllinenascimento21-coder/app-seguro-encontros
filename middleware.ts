import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/cadastro',
  '/planos',
  '/auth/callback',
  '/reset-password',
  '/update-password',
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
]

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
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
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const pathname = req.nextUrl.pathname

  const isProtected = PROTECTED_PATHS.some((p) =>
    pathMatches(pathname, p)
  )

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
