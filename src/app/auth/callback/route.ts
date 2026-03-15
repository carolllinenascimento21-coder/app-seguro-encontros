import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_REDIRECT_PATH = '/home'

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_REDIRECT_PATH
  if (!next.startsWith('/')) return DEFAULT_REDIRECT_PATH
  if (next.startsWith('//')) return DEFAULT_REDIRECT_PATH
  return next
}

export async function GET(request: NextRequest) {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('auth/callback')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return new NextResponse('Supabase público não configurado', { status: 503 })
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('auth callback exchange error', {
      message: exchangeError.message,
      status: exchangeError.status,
      code: exchangeError.code,
    })

    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'auth_callback_failed')
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
