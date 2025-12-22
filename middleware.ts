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

  const pathname = req.nextUrl.pathname

  // 🚨 SOMENTE A ROTA SENSÍVEL
  if (pathname.startsWith('/modo-seguro')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 🔒 Não logado → login
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // 🔎 Verifica selfie
    const { data: profile } = await supabase
      .from('profiles')
      .select('selfie_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.selfie_verified) {
      return NextResponse.redirect(
        new URL('/verificacao-selfie', req.url)
      )
    }
  }

  // ❗ NÃO BLOQUEIA MAIS NADA
  return res
}

export const config = {
  matcher: ['/modo-seguro'],
}
