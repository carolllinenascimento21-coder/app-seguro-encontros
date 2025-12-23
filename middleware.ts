import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/verificacao-selfie',
  '/onboarding',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // ✅ Ignora arquivos estáticos, api e assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon')
  ) {
    return res
  }

  // 🔓 Rotas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return res
  }

  // 🔒 Não logada → login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 🔐 Logada → checa selfie
  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .single()

  if (
    profile &&
    profile.selfie_verified === false &&
    !pathname.startsWith('/verificacao-selfie')
  ) {
    return NextResponse.redirect(
      new URL('/verificacao-selfie', req.url)
    )
  }

  return res
}

export const config = {
  matcher: [
    /*
      Aplica middleware SOMENTE em páginas de app,
      não em assets nem callbacks
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
