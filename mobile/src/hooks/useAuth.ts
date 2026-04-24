import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Linking as ReactNativeLinking, Platform } from 'react-native'
import * as ExpoLinking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { Session, User } from '@supabase/supabase-js'

import { supabase } from '../services/supabase'

type Credentials = {
  email: string
  password: string
}

type OAuthProvider = 'google' | 'apple'

const OAUTH_TIMEOUT_MS = 90_000
const SESSION_RETRY_ATTEMPTS = 20
const SESSION_RETRY_DELAY_MS = 300
const DEFAULT_APP_SCHEME = 'confiamais'
const FLOW_ID_QUERY_PARAM = 'flow_id'

WebBrowser.maybeCompleteAuthSession()

function createFlowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getConfiguredScheme() {
  const configuredScheme = Constants.expoConfig?.scheme
  if (Array.isArray(configuredScheme)) {
    return configuredScheme[0] || DEFAULT_APP_SCHEME
  }
  return configuredScheme || DEFAULT_APP_SCHEME
}

function getRedirectUrl(flowId?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }

  const scheme = getConfiguredScheme()
  const baseRedirectUrl = ExpoLinking.createURL('auth/callback', { scheme })

  if (!flowId) return baseRedirectUrl

  const separator = baseRedirectUrl.includes('?') ? '&' : '?'
  return `${baseRedirectUrl}${separator}${FLOW_ID_QUERY_PARAM}=${encodeURIComponent(flowId)}`
}

function getQueryParam(rawUrl: string, key: string) {
  try {
    const parsed = new URL(rawUrl)
    return parsed.searchParams.get(key)
  } catch {
    const query = rawUrl.split('?')[1] ?? ''
    const params = new URLSearchParams(query)
    return params.get(key)
  }
}

function normalizeUrlForComparison(url: string) {
  return url.replace(/\/+(\?|$)/, '$1')
}

function isExpectedOAuthUrl(url: string | null, redirectTo: string, expectedState: string | null) {
  if (!url) return false

  const normalizedUrl = normalizeUrlForComparison(url)
  const normalizedRedirectTo = normalizeUrlForComparison(redirectTo)

  if (!normalizedUrl.startsWith(normalizedRedirectTo)) return false
  if (!normalizedUrl.includes('auth/callback')) return false

  const hasAuthPayload = Boolean(getQueryParam(normalizedUrl, 'code') || getQueryParam(normalizedUrl, 'error'))
  if (!hasAuthPayload) return false

  if (!expectedState) return true

  const callbackState = getQueryParam(normalizedUrl, 'state')
  return Boolean(callbackState && callbackState === expectedState)
}

function waitForAuthRedirect(
  redirectTo: string,
  expectedState: string | null,
  flowId: string | null,
  lastHandledUrlRef: MutableRefObject<string | null>
) {
  return new Promise<string | null>((resolve) => {
    let settled = false
    let subscription: { remove: () => void } | null = null

    const complete = (url: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      subscription?.remove()
      resolve(url)
    }

    const tryConsume = (url: string | null) => {
      if (!isExpectedOAuthUrl(url, redirectTo, expectedState)) return
      if (url === lastHandledUrlRef.current) return

      if (flowId) {
        const callbackFlowId = getQueryParam(url!, FLOW_ID_QUERY_PARAM)
        if (!callbackFlowId || callbackFlowId !== flowId) return
      }

      lastHandledUrlRef.current = url
      complete(url)
    }

    const timeoutId = setTimeout(() => {
      complete(null)
    }, OAUTH_TIMEOUT_MS)

    ReactNativeLinking.getInitialURL()
      .then((initialUrl) => tryConsume(initialUrl))
      .catch(() => {
        // ignora
      })

    subscription = ReactNativeLinking.addEventListener('url', ({ url }) => {
      tryConsume(url)
    })
  })
}

async function waitForSessionToPersist() {
  for (let attempt = 0; attempt < SESSION_RETRY_ATTEMPTS; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) return session

    await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS))
  }

  return null
}

async function waitAndAcquireResolutionLock(resolvingRef: MutableRefObject<boolean>) {
  const delayMs = 50

  while (true) {
    if (!resolvingRef.current) {
      resolvingRef.current = true
      return
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const oauthInFlightRef = useRef(false)
  const resolvingRef = useRef(false)
  const lastHandledUrlRef = useRef<string | null>(null)
  const lastProcessedCodeRef = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async ({ email, password }: Credentials) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (oauthInFlightRef.current) {
      return { cancelled: true }
    }

    oauthInFlightRef.current = true

    try {
      const flowId = Platform.OS === 'web' ? null : createFlowId()
      const redirectTo = getRedirectUrl(flowId ?? undefined)
      console.log('[ConfiaOAuth][v3] oauth_start', { provider, flowId, redirectTo, platform: Platform.OS })

      let authStartUrl: string
      let expectedState: string | null = null

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw new Error(error.message)
      if (!data?.url) throw new Error('OAuth sem URL')

      authStartUrl = data.url
      expectedState = getQueryParam(data.url, 'state')
      console.log('[ConfiaOAuth][v3] oauth_provider_url_ready', {
        provider,
        flowId,
        expectedState,
      })

      if (Platform.OS === 'web') {
        window.location.assign(authStartUrl)
        return { cancelled: false }
      }

      const pendingRedirect = waitForAuthRedirect(
        redirectTo,
        expectedState,
        flowId,
        lastHandledUrlRef
      )

      const authSessionResult = await WebBrowser.openAuthSessionAsync(authStartUrl, redirectTo)

      let callbackUrl: string | null = null

      if (authSessionResult.type === 'success') {
        callbackUrl = authSessionResult.url
      }

      if (!isExpectedOAuthUrl(callbackUrl, redirectTo, expectedState)) {
        callbackUrl = await pendingRedirect
      }

      if (!isExpectedOAuthUrl(callbackUrl, redirectTo, expectedState)) {
        return { cancelled: true }
      }

      if (flowId) {
        const callbackFlowId = getQueryParam(callbackUrl!, FLOW_ID_QUERY_PARAM)
        if (!callbackFlowId || callbackFlowId !== flowId) {
          return { cancelled: true }
        }
      }

      const callbackError = getQueryParam(callbackUrl!, 'error')
      if (callbackError) {
        throw new Error('Falha no retorno da autenticação social.')
      }

      const code = getQueryParam(callbackUrl!, 'code')
      if (!code) return { cancelled: true }

      await waitAndAcquireResolutionLock(resolvingRef)

      try {
        if (code === lastProcessedCodeRef.current) {
          const {
            data: { session: existingSession },
          } = await supabase.auth.getSession()

          if (existingSession) {
            return { cancelled: false }
          }
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          const {
            data: { session: existingSession },
          } = await supabase.auth.getSession()

          if (!existingSession) {
            throw new Error(exchangeError.message)
          }
        }

        const persistedSession = await waitForSessionToPersist()
        if (!persistedSession) {
          console.error('OAuth Google sem sessão persistida após retries', {
            provider,
            flowId,
            hasState: Boolean(expectedState),
          })
          throw new Error('Sessão não persistida após autenticação social.')
        }

        lastProcessedCodeRef.current = code
      } finally {
        resolvingRef.current = false
      }

      return { cancelled: false }
    } finally {
      oauthInFlightRef.current = false
    }
  }, [])

  const signInWithGoogle = useCallback(
    async () => signInWithOAuth('google'),
    [signInWithOAuth]
  )

  const signInWithApple = useCallback(
    async () => signInWithOAuth('apple'),
    [signInWithOAuth]
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }, [])

  return {
    loading,
    session,
    user,
    isAuthenticated: Boolean(session?.user),
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
  }
}
