import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'
const DEFAULT_RETURN_MODE = 'web'
const APP_RETURN_MODE = 'app'
const ALLOWED_MOBILE_SCHEMES = new Set(['confiamais'])
const MOBILE_CALLBACK_PATH = '/auth/callback'
const OAUTH_STATE_COOKIE = 'confia_oauth_state'

function isAllowedMobileCallbackPath(parsed: URL) {
  if (parsed.pathname === MOBILE_CALLBACK_PATH) return true
  if (parsed.hostname === 'auth' && parsed.pathname === '/callback') return true
  return false
}

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/')) return DEFAULT_NEXT_PATH
  if (next.startsWith('//')) return DEFAULT_NEXT_PATH
  if (next.startsWith('/auth/callback')) return DEFAULT_NEXT_PATH
  return next
}

function getMobileRedirectTarget(redirectTo: string | null) {
  if (!redirectTo) return null

  try {
    const parsed = new URL(redirectTo)
    const protocol = parsed.protocol.replace(':', '')

    if (!ALLOWED_MOBILE_SCHEMES.has(protocol)) return null

    if (!isAllowedMobileCallbackPath(parsed)) {
      console.warn('OAuth mobile callback inválido:', parsed.toString())
      return null
    }

    return parsed.toString()
  } catch (err) {
    console.error('Erro redirect_to mobile:', err)
    return null
  }
}

function getReturnMode(rawMode: string | null) {
  if (rawMode === APP_RETURN_MODE) return APP_RETURN_MODE
  return DEFAULT_RETURN_MODE
}

export async function GET(req: Request) {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('api/auth/google')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json({ error: 'Supabase público não configurado' }, { status: 503 })
  }

  const requestUrl = new URL(req.url)
  const returnMode = getReturnMode(requestUrl.searchParams.get('return_mode'))
  const platform = requestUrl.searchParams.get('platform')
  const flowId = requestUrl.searchParams.get('flow_id')
  const nonce = requestUrl.searchParams.get('nonce')

  const mobileRedirectTo = getMobileRedirectTarget(
    requestUrl.searchParams.get('return_to') ?? requestUrl.searchParams.get('redirect_to')
  )

  const nextPath = getSafeRedirectPath(
    requestUrl.searchParams.get('next')
  )

  const callbackUrl = new URL('/auth/callback', requestUrl.origin)
  callbackUrl.searchParams.set('next', nextPath)

  if (returnMode === APP_RETURN_MODE && mobileRedirectTo) {
    callbackUrl.searchParams.set('return_mode', APP_RETURN_MODE)
    callbackUrl.searchParams.set('platform', platform || 'android')
    callbackUrl.searchParams.set('return_to', mobileRedirectTo)
    if (flowId) callbackUrl.searchParams.set('flow_id', flowId)
    if (nonce) callbackUrl.searchParams.set('nonce', nonce)

    console.log('[GOOGLE OAUTH START] fluxo app inicializado', {
      platform: platform || 'android',
      hasFlowId: Boolean(flowId),
      hasNonce: Boolean(nonce),
      returnTo: mobileRedirectTo,
    })
  }

  const redirectTo = callbackUrl.toString()

  if (returnMode === APP_RETURN_MODE && !mobileRedirectTo) {
    console.error('[GOOGLE OAUTH START] fluxo app sem return_to válido')
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'google_app_return_to_invalid')
    return NextResponse.redirect(loginUrl)
  }

  const cookieStore = await cookies()

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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data?.url) {
    console.error('OAuth Google erro:', error)
    return NextResponse.redirect(
      new URL('/login?error=google_oauth_start', requestUrl.origin)
    )
  }

  let finalOAuthStartUrl = data.url

  try {
    const oauthStartUrl = new URL(data.url)
    const oauthState = oauthStartUrl.searchParams.get('state')

    if (oauthState) {
      const callbackUrlWithState = new URL(redirectTo)
      callbackUrlWithState.searchParams.set('oauth_state', oauthState)
      oauthStartUrl.searchParams.set('redirect_to', callbackUrlWithState.toString())
      finalOAuthStartUrl = oauthStartUrl.toString()

      cookieStore.set(OAUTH_STATE_COOKIE, oauthState, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 10,
      })
    }
  } catch (parseError) {
    console.warn('[GOOGLE OAUTH START] não foi possível extrair state:', parseError)
  }

  return NextResponse.redirect(finalOAuthStartUrl)
}
