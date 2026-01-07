import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { pathname } = req.nextUrl

  const PUBLIC_ROUTES = ['/', '/onboarding', '/login', '/signup']

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 4️⃣ NÃO LOGADA → só pode ver públicas
  if (!session) {
    const isPublicRoute = PUBLIC_ROUTES.some(
      r => pathname === r || pathname.startsWith(`${r}/`)
    )

    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  }

  // 5️⃣ LOGADA → bloqueia login/signup
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
