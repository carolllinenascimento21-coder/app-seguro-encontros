import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  if (!req.nextUrl.pathname.startsWith('/perfil') && !req.nextUrl.pathname.startsWith('/profile')) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile?.selfie_verified) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/verificacao-selfie'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/perfil/:path*', '/profile/:path*'],
}
