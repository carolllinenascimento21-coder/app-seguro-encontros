import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/')) return DEFAULT_NEXT_PATH
  if (next.startsWith('//')) return DEFAULT_NEXT_PATH
  if (next.startsWith('/auth/callback')) return DEFAULT_NEXT_PATH
  return next
}

function buildLoginErrorRedirect(origin: string, next: string, error: string) {
  const url = new URL('/login', origin)
  url.searchParams.set('error', error)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url)
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
  const providerError = searchParams.get('error')
  const next = getSafeRedirectPath(searchParams.get('next'))

  if (providerError) {
    console.error('OAuth provider retornou erro no callback:', providerError)
    return buildLoginErrorRedirect(origin, next, providerError)
  }

  if (!code) {
    console.warn('OAuth callback sem code; enviando para destino seguro.', { next })
    return NextResponse.redirect(new URL(next, origin))
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
          } catch (error) {
            console.error('Erro ao salvar cookies no callback OAuth:', error)
          }
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
      console.warn('Código OAuth já utilizado; sessão existente reaproveitada.', {
        userId: existingSession.user.id,
      })
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Falha no exchangeCodeForSession:', {
      message: exchangeError.message,
      status: exchangeError.status,
      code: exchangeError.code,
    })
    return buildLoginErrorRedirect(origin, next, 'auth_callback_failed')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    console.error('Sessão não persistida após callback OAuth:', {
      message: sessionError?.message,
      status: sessionError?.status,
      code: sessionError?.code,
      hasSession: Boolean(session),
    })
    return buildLoginErrorRedirect(origin, next, 'auth_session_not_persisted')
  }

  return NextResponse.redirect(new URL(next, origin))
}
