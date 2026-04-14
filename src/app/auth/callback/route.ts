import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_REDIRECT_PATH = '/home'
const LOGIN_PATH = '/login'

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_REDIRECT_PATH
  if (!next.startsWith('/')) return DEFAULT_REDIRECT_PATH
  if (next.startsWith('//')) return DEFAULT_REDIRECT_PATH
  return next
}

function buildLoginRedirect(origin: string, next: string, error: string) {
  const loginUrl = new URL(LOGIN_PATH, origin)
  loginUrl.searchParams.set('error', error)
  loginUrl.searchParams.set('next', next)
  return NextResponse.redirect(loginUrl)
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
  const providerError = searchParams.get('error')

  if (next === LOGIN_PATH || next.startsWith('/auth/callback')) {
    return NextResponse.redirect(`${origin}${DEFAULT_REDIRECT_PATH}`)
  }

  if (providerError) {
    return buildLoginRedirect(origin, next, providerError)
  }

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
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession()

    if (existingSession) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('auth callback exchange error', {
      message: exchangeError.message,
      status: exchangeError.status,
      code: exchangeError.code,
    })

    return buildLoginRedirect(origin, next, 'auth_callback_failed')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    console.error('auth callback session validation error', {
      sessionError,
      hasSession: Boolean(session),
    })

    return buildLoginRedirect(origin, next, 'auth_session_not_persisted')
  }

  return NextResponse.redirect(`${origin}${next}`)
}
