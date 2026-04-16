import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, Platform } from 'react-native'
import Constants from 'expo-constants'
import { Session, User } from '@supabase/supabase-js'

import { supabase } from '../services/supabase'

type Credentials = {
  email: string
  password: string
}

type OAuthProvider = 'google' | 'apple'

const OAUTH_TIMEOUT_MS = 90_000

function getRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }

  const scheme = Constants.expoConfig?.scheme || 'confiaplus'
  return `${scheme}://auth/callback`
}

function waitForAuthRedirect(redirectTo: string) {
  return new Promise<string | null>(async (resolve) => {
    let settled = false
    let subscription: { remove: () => void } | null = null

    const complete = (url: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      subscription?.remove()
      resolve(url)
    }

    const timeoutId = setTimeout(() => {
      complete(null)
    }, OAUTH_TIMEOUT_MS)

    const initialUrl = await Linking.getInitialURL()
    if (initialUrl?.startsWith(redirectTo)) {
      complete(initialUrl)
      return
    }

    subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.startsWith(redirectTo)) return
      complete(url)
    })
  })
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

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const oauthInFlightRef = useRef(false)

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

    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (oauthInFlightRef.current) {
      return { cancelled: true }
    }

    oauthInFlightRef.current = true

    try {
      const redirectTo = getRedirectUrl()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.url) {
        throw new Error('Não foi possível iniciar autenticação social.')
      }

      const pendingRedirect = waitForAuthRedirect(redirectTo)

      await Linking.openURL(data.url)

      const callbackUrl = await pendingRedirect

      if (!callbackUrl) {
        return { cancelled: true }
      }

      const callbackError = getQueryParam(callbackUrl, 'error')
      if (callbackError) {
        throw new Error('Falha no retorno da autenticação social.')
      }

      const code = getQueryParam(callbackUrl, 'code')
      if (!code) {
        return { cancelled: true }
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

    if (error) {
      throw new Error(error.message)
    }
  }, [])

  return {
    loading,
    session,
    user,
    isAuthenticated: Boolean(session?.user),
    signIn,
    signInWithApple,
    signInWithGoogle,
    signOut,
  }
}
