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
const SESSION_RETRY_ATTEMPTS = 8
const SESSION_RETRY_DELAY_MS = 250
const DEFAULT_APP_SCHEME = 'confiamais'

WebBrowser.maybeCompleteAuthSession()

function getRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }

  const scheme = Constants.expoConfig?.scheme || DEFAULT_APP_SCHEME
  return ExpoLinking.createURL('auth/callback', { scheme })
}

function getGoogleAuthStartUrl(redirectTo: string) {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '')

  if (!apiBaseUrl) {
    throw new Error('Variável de ambiente ausente: EXPO_PUBLIC_API_BASE_URL.')
  }

  return `${apiBaseUrl}/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}`
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

function isExpectedOAuthUrl(url: string | null, redirectTo: string, expectedState: string | null) {
  if (!url) return false
  if (!url.startsWith(redirectTo)) return false

  const hasAuthPayload = Boolean(getQueryParam(url, 'code') || getQueryParam(url, 'error'))
  if (!hasAuthPayload) return false

  if (!expectedState) return true

  const callbackState = getQueryParam(url, 'state')
  return Boolean(callbackState && callbackState === expectedState)
}

function waitForAuthRedirect(
  redirectTo: string,
  expectedState: string | null,
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

      lastHandledUrlRef.current = url
      complete(url)
    }

    const timeoutId = setTimeout(() => {
      complete(null)
    }, OAUTH_TIMEOUT_MS)

    ReactNativeLinking.getInitialURL()
      .then((initialUrl) => tryConsume(initialUrl))
      .catch(() => {})

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

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const oauthInFlightRef = useRef(false)
  const processingRef = useRef(false)
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
      const redirectTo = getRedirectUrl()

      let authStartUrl: string
      let expectedState: string | null = null

      if (provider === 'google' && Platform.OS !== 'web') {
        authStartUrl = getGoogleAuthStartUrl(redirectTo)
      } else {
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
      }

      const pendingRedirect = waitForAuthRedirect(redirectTo, expectedState, lastHandledUrlRef)

      if (Platform.OS === 'web') {
        window.location.assign(authStartUrl)
        return { cancelled: false }
      }

      await WebBrowser.openAuthSessionAsync(authStartUrl, redirectTo)

      // 🔴 SEMPRE usar o listener (corrige Google + Apple)
      const callbackUrl = await pendingRedirect

      if (!isExpectedOAuthUrl(callbackUrl, redirectTo, expectedState)) {
        return { cancelled: true }
      }

      const code = getQueryParam(callbackUrl!, 'code')
      if (!code) return { cancelled: true }

      if (processingRef.current || code === lastProcessedCodeRef.current) {
        return { cancelled: true }
      }

      processingRef.current = true
      lastProcessedCodeRef.current = code

      try {
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
          throw new Error('Sessão não persistida')
        }
      } finally {
        processingRef.current = false
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
