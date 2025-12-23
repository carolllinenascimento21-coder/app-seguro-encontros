import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

  // Rotas públicas (não protegidas)
  const publicRoutes = [
    '/login',
    '/signup',
    '/verificacao-selfie',
    '/onboarding/aceitar-termos',
  ]

  // 🔒 Usuária não logada
  if (!session && !publicRoutes.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 🔐 Usuária logada → checar selfie
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('selfie_verified')
      .eq('id', session.user.id)
      .single()

    // ❌ Selfie NÃO verificada → força rota
    if (
      profile &&
      profile.selfie_verified === false &&
      !pathname.startsWith('/verificacao-selfie')
    ) {
      return NextResponse.redirect(
        new URL('/verificacao-selfie', req.url)
      )
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}
