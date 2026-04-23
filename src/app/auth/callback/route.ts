import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'
const LAST_HANDLED_CODE_COOKIE = 'confia_last_oauth_code'

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/')) return DEFAULT_NEXT_PATH
  if (next.startsWith('//')) return DEFAULT_NEXT_PATH
  if (next.startsWith('/auth/callback')) return DEFAULT_NEXT_PATH
  return next
}

function buildError(
  origin: string,
  next: string,
  error: string,
  errorDescription?: string | null,
  errorCode?: string | null
) {
  const isRecoveryFlow = next === '/update-password'
  const url = new URL(isRecoveryFlow ? '/update-password' : '/login', origin)
  url.searchParams.set('error', error)

  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription)
  }

  if (errorCode) {
    url.searchParams.set('error_code', errorCode)
  }

  if (!isRecoveryFlow) {
    url.searchParams.set('next', next)
  }

  return NextResponse.redirect(url)
}

function buildSuccessRedirect(origin: string, next: string, code: string) {
  const response = NextResponse.redirect(new URL(next, origin))

  response.cookies.set(LAST_HANDLED_CODE_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 5,
  })

  return response
}

async function getSessionWithRetry(
  supabase: ReturnType<typeof createServerClient>,
  attempts = 4,
  delayMs = 150
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session

    if (session) {
      return { session, error: sessionResult.error }
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    } else {
      return { session: null, error: sessionResult.error }
    }
  }

  return { session: null, error: null }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  const providerErrorCode = searchParams.get('error_code')
  const next = getSafeRedirectPath(searchParams.get('next'))

  if (providerError) {
    console.error('[AUTH CALLBACK] Provider error:', {
      error: providerError,
      errorCode: providerErrorCode,
      errorDescription: providerErrorDescription,
      next,
    })
    return buildError(origin, next, providerError, providerErrorDescription, providerErrorCode)
  }

  if (!code) {
    console.warn('[AUTH CALLBACK] Sem code; redirecionando para:', next)
    return NextResponse.redirect(new URL(next, origin))
  }

  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('auth/callback')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error('[AUTH CALLBACK] ENV ERROR:', envError.message)
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    console.error('[AUTH CALLBACK] Supabase não configurado')
    return new NextResponse('Supabase não configurado', { status: 503 })
  }

  const cookieStore = await cookies()
  const lastHandledCode = cookieStore.get(LAST_HANDLED_CODE_COOKIE)?.value

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // 🔒 CORREÇÃO PRINCIPAL:
  // só ignora code repetido se já houver sessão válida
  if (lastHandledCode && lastHandledCode === code) {
    const { session: existingSession, error: existingSessionError } = await getSessionWithRetry(
      supabase
    )

    if (existingSessionError) {
      console.error('[AUTH CALLBACK] Erro ao verificar sessão existente:', {
        message: existingSessionError.message,
        status: existingSessionError.status,
        code: existingSessionError.code,
      })
    }

    if (existingSession) {
      console.warn('[AUTH CALLBACK] Code repetido com sessão válida; reaproveitando sessão', {
        userId: existingSession.user.id,
      })
      return buildSuccessRedirect(origin, next, code)
    }

    console.warn('[AUTH CALLBACK] Code repetido sem sessão válida; tentando exchange novamente')
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[AUTH CALLBACK] exchangeCodeForSession falhou:', {
      message: exchangeError.message,
      status: exchangeError.status,
      code: exchangeError.code,
    })

    const { session, error: sessionError } = await getSessionWithRetry(supabase)

    if (sessionError) {
      console.error('[AUTH CALLBACK] Erro ao verificar sessão após falha no exchange:', {
        message: sessionError.message,
        status: sessionError.status,
        code: sessionError.code,
      })
    }

    if (!session) {
      return buildError(origin, next, 'auth_exchange_failed')
    }

    console.warn('[AUTH CALLBACK] Sessão já existia após falha no exchange; continuando')
  }

  const { session: persistedSession, error: persistedSessionError } = await getSessionWithRetry(
    supabase
  )

  if (persistedSessionError) {
    console.error('[AUTH CALLBACK] Erro ao validar sessão persistida:', {
      message: persistedSessionError.message,
      status: persistedSessionError.status,
      code: persistedSessionError.code,
    })
  }

  if (!persistedSession) {
    console.error('[AUTH CALLBACK] Sessão não persistida após callback')
    return buildError(origin, next, 'auth_session_not_persisted')
  }

  console.log('[AUTH CALLBACK] Login finalizado com sucesso', {
    userId: persistedSession.user.id,
  })

  return buildSuccessRedirect(origin, next, code)
}
