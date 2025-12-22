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
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

  // 🔒 Rotas públicas
  const publicRoutes = ['/login', '/signup']

  // 🔐 Se não estiver logado
  if (!user) {
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // 🚫 Se estiver logado, não pode acessar login/signup
  if (publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  // 🔎 Busca status da selfie
  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', user.id)
    .maybeSingle()

  const selfieVerified = profile?.selfie_verified === true

  // 🚨 Bloqueia modo seguro sem selfie
  if (!selfieVerified && pathname.startsWith('/modo-seguro')) {
    return NextResponse.redirect(
      new URL('/verificacao-selfie', req.url)
    )
  }

  // 🚫 Bloqueia acesso à verificação se já verificado
  if (selfieVerified && pathname.startsWith('/verificacao-selfie')) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware apenas nessas rotas
     */
    '/login',
    '/signup',
    '/home',
    '/perfil',
    '/modo-seguro',
    '/verificacao-selfie',
  ],
}
