import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 🔥 PROVA ABSOLUTA
  // Se isso não funcionar, o middleware NÃO está ativo
  if (pathname.startsWith('/funil')) {
    return NextResponse.next()
  }

  // Todas as outras rotas vão para onboarding
  return NextResponse.redirect(new URL('/onboarding', req.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
