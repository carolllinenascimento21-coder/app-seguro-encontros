import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  const pathname = req.nextUrl.pathname

  if (pathMatches(pathname, '/auth/callback')) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PATHS.some((p) =>
    pathMatches(pathname, p)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

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

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('next', pathname)
    redirectUrl.searchParams.set('sg_reason', 'no_session')
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathMatches(pathname, '/onboarding/selfie') === false) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selfie_verified,onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Falha ao validar gate de selfie no middleware:', profileError)
      res.headers.set('x-selfie-gate', 'profile_error_allow')
    } else {
      const mustCompleteSelfie =
        !profile || profile.selfie_verified !== true || profile.onboarding_completed !== true

      console.log('[SelfieGate][middleware] gate_decision', {
        userId: user.id,
        pathname,
        selfie_verified: profile?.selfie_verified ?? null,
        onboarding_completed: profile?.onboarding_completed ?? null,
        mustCompleteSelfie,
      })

      if (mustCompleteSelfie) {
        const redirectUrl = new URL('/onboarding/selfie', req.url)
        redirectUrl.searchParams.set('next', pathname)
        redirectUrl.searchParams.set('sg_reason', 'missing_selfie_or_onboarding')
        return NextResponse.redirect(redirectUrl)
      }

      res.headers.set('x-selfie-gate', 'ok')
    }
  } else if (user) {
    res.headers.set('x-selfie-gate', 'skip_selfie_route')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
