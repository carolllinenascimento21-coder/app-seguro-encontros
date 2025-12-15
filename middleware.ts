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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('selfie_verified')
    .eq('id', session.user.id)
    .maybeSingle()

  let selfieVerified = profile?.selfie_verified ?? false

  if (!profile && !profileError) {
    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, email: session.user.email })
      .select('selfie_verified')
      .single()

    selfieVerified = created?.selfie_verified ?? false
  }

  if (!selfieVerified) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/verificacao-selfie'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/perfil/:path*', '/profile/:path*'],
}
