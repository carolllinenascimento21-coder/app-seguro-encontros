import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/',
  '/funil',
  '/login',
  '/register',
  '/planos',
  '/auth/callback',
  '/reset-password',
  '/update-password',
  '/verify-selfie',
]

// Páginas que exigem login
const PROTECTED_PATHS = [
  '/consultar-reputacao',
  '/avaliar',
  '/alertas',
  '/perfil',
  '/minhas-avaliacoes',
  '/configuracoes',
]

// Rotas que NÃO devem disparar selfie gate (pra evitar loop / permitir concluir selfie)
const SELFIE_EXCEPTIONS = ['/verify-selfie', '/auth/callback', '/login', '/reset-password', '/update-password']

function pathMatches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublicRoute = PUBLIC_PATHS.some((p) => pathMatches(pathname, p))
  const isProtectedRoute = PROTECTED_PATHS.some((p) => pathMatches(pathname, p))

  // NextResponse que preserva headers/cookies
  let res = NextResponse.next({ request: { headers: req.headers } })

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
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public -> segue
  if (isPublicRoute) {
    res.headers.set('x-middleware-active', 'true')
    res.headers.set('x-middleware-path', pathname)
    return res
  }

  // Protegida e sem login -> /login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(loginUrl)
    redirect.headers.set('x-reason', 'login-required')
    return redirect
  }

  // Se não é protegida, mas também não é pública, deixe seguir (ou ajuste suas regras aqui)
  if (!isProtectedRoute) {
    res.headers.set('x-middleware-active', 'true')
    res.headers.set('x-middleware-path', pathname)
    return res
  }

  // ===== Selfie Gate =====
  // Se já está logado e está numa rota protegida, exige selfie (exceto páginas do fluxo)
  const shouldSkipSelfie = SELFIE_EXCEPTIONS.some((p) => pathMatches(pathname, p))
  if (user && !shouldSkipSelfie) {
    // tenta ler o profile do usuário; depende de RLS permitir select do próprio perfil
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('selfie_verified, selfie_url, is_active')
      .eq('id', user.id)
      .maybeSingle()

    // Se erro de RLS, não vamos “travar” o app; apenas segue
    if (!error) {
      // Se conta desativada, joga pro login (ou crie uma página específica)
      if (profile?.is_active === false) {
        const loginUrl = new URL('/login', req.url)
        const redirect = NextResponse.redirect(loginUrl)
        redirect.headers.set('x-reason', 'inactive-account')
        return redirect
      }

      const selfieOk = Boolean(profile?.selfie_verified) && Boolean(profile?.selfie_url)
      if (!selfieOk) {
        const verifyUrl = new URL('/verify-selfie', req.url)
        verifyUrl.searchParams.set('next', pathname)
        const redirect = NextResponse.redirect(verifyUrl)
        redirect.headers.set('x-reason', 'selfie-required')
        return redirect
      }
    }
  }

  res.headers.set('x-middleware-active', 'true')
  res.headers.set('x-middleware-path', pathname)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
