import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'
const LAST_HANDLED_CODE_COOKIE = 'confia_last_oauth_code'
const OAUTH_STATE_COOKIE = 'confia_oauth_state'
const APP_RETURN_MODE = 'app'
const ALLOWED_APP_SCHEMES = new Set(['confiamais'])
const APP_CALLBACK_PATH = '/auth/callback'
const DEFAULT_APP_RETURN_TO = 'confiamais://auth/callback'

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

function isAllowedAppCallback(parsed: URL) {
  if (parsed.pathname === APP_CALLBACK_PATH) return true
  if (parsed.hostname === 'auth' && parsed.pathname === '/callback') return true
  return false
}

function getSafeAppReturnTo(returnTo: string | null) {
  if (!returnTo) return null

  try {
    const parsed = new URL(returnTo)
    const protocol = parsed.protocol.replace(':', '')

    if (!ALLOWED_APP_SCHEMES.has(protocol)) return null
    if (!isAllowedAppCallback(parsed)) return null

    return parsed.toString()
  } catch {
    return null
  }
}

function buildAppRedirect(
  appReturnTo: string,
  params: {
    code?: string | null
    state?: string | null
    flowId?: string | null
    nonce?: string | null
    error?: string | null
    errorDescription?: string | null
    errorCode?: string | null
  }
) {
  const appUrl = new URL(appReturnTo)

  if (params.code) appUrl.searchParams.set('code', params.code)
  if (params.state) appUrl.searchParams.set('state', params.state)
  if (params.flowId) appUrl.searchParams.set('flow_id', params.flowId)
  if (params.nonce) appUrl.searchParams.set('nonce', params.nonce)
  if (params.error) appUrl.searchParams.set('error', params.error)
  if (params.errorDescription) appUrl.searchParams.set('error_description', params.errorDescription)
  if (params.errorCode) appUrl.searchParams.set('error_code', params.errorCode)

  return NextResponse.redirect(appUrl)
}

function clearOauthStateCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
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
  console.log('[AUTH CALLBACK][v3] hit', { rawUrl: request.url })
  const cookieStore = await cookies()

  const code = searchParams.get('code')
  const stateFromAppStart = searchParams.get('app_state')
  const stateFromQuery = searchParams.get('state')
  const stateFromRedirectParam = searchParams.get('oauth_state')
  const stateFromCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null
  const state = stateFromAppStart ?? stateFromQuery ?? stateFromRedirectParam ?? stateFromCookie
  const flowId = searchParams.get('flow_id')
  const nonce = searchParams.get('nonce')
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  const providerErrorCode = searchParams.get('error_code')
  const next = getSafeRedirectPath(searchParams.get('next'))
  const returnMode = searchParams.get('return_mode')
  const appReturnTo = getSafeAppReturnTo(searchParams.get('return_to'))
  const isAppMode = returnMode === APP_RETURN_MODE && Boolean(appReturnTo)
  const inferredAppMode = !isAppMode && Boolean(code && flowId && state)
  const inferredAppReturnTo = inferredAppMode ? DEFAULT_APP_RETURN_TO : null

  if (!stateFromQuery && (stateFromAppStart || stateFromRedirectParam || stateFromCookie)) {
    console.log('[AUTH CALLBACK] state ausente na query; usando fallback persistido', {
      fromAppStart: Boolean(stateFromAppStart),
      fromRedirectParam: Boolean(stateFromRedirectParam),
      fromCookie: Boolean(stateFromCookie),
    })
  }

  if (providerError) {
    console.error('[AUTH CALLBACK] Provider error:', {
      error: providerError,
      errorCode: providerErrorCode,
      errorDescription: providerErrorDescription,
      next,
      isAppMode,
      hasFlowId: Boolean(flowId),
    })

    if (isAppMode && appReturnTo) {
      console.warn('[AUTH CALLBACK] retorno app com erro de provider')
      return buildAppRedirect(appReturnTo, {
        state,
        flowId,
        nonce,
        error: providerError,
        errorDescription: providerErrorDescription,
        errorCode: providerErrorCode,
      })
    }

    return buildError(origin, next, providerError, providerErrorDescription, providerErrorCode)
  }

  if (!code) {
    console.warn('[AUTH CALLBACK] Sem code; redirecionando para:', next)
    if (isAppMode && appReturnTo) {
      return buildAppRedirect(appReturnTo, {
        state,
        flowId,
        nonce,
        error: 'missing_code',
      })
    }
    return NextResponse.redirect(new URL(next, origin))
  }

  if ((isAppMode && appReturnTo) || inferredAppReturnTo) {
    const targetReturnTo = appReturnTo ?? inferredAppReturnTo!
    console.log('[AUTH CALLBACK] modo app: retornando code para exchange no app', {
      inferredAppMode,
      hasState: Boolean(state),
      hasFlowId: Boolean(flowId),
      hasNonce: Boolean(nonce),
    })

    const response = buildAppRedirect(targetReturnTo, {
      code,
      state,
      flowId,
      nonce,
    })
    clearOauthStateCookie(response)
    return response
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
      if (isAppMode && appReturnTo) {
        return buildAppRedirect(appReturnTo, {
          state,
          flowId,
          nonce,
          error: 'auth_exchange_failed',
        })
      }
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
    if (isAppMode && appReturnTo) {
      return buildAppRedirect(appReturnTo, {
        state,
        flowId,
        nonce,
        error: 'auth_session_not_persisted',
      })
    }
    return buildError(origin, next, 'auth_session_not_persisted')
  }

  console.log('[AUTH CALLBACK] Login finalizado com sucesso', {
    userId: persistedSession.user.id,
    isAppMode,
    hasFlowId: Boolean(flowId),
  })

  if (returnMode === APP_RETURN_MODE && !isAppMode) {
    console.error('[AUTH CALLBACK] return_mode=app sem return_to válido; fallback web')
  }

  console.log('[AUTH CALLBACK] redirect final web', { next })

  const response = buildSuccessRedirect(origin, next, code)
  clearOauthStateCookie(response)

  return response
}
