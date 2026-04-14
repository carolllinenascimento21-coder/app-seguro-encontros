import { useCallback, useEffect, useState } from 'react'
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
  return new Promise<string | null>((resolve) => {
    const timeoutId = setTimeout(() => {
      subscription.remove()
      resolve(null)
    }, OAUTH_TIMEOUT_MS)

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.startsWith(redirectTo)) return

      clearTimeout(timeoutId)
      subscription.remove()
      resolve(url)
    })
  })
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

    // Aguarda o retorno do deep link (mobile)
    const pendingRedirect = waitForAuthRedirect(redirectTo)

    // Abre o provedor (Apple / Google)
    await Linking.openURL(data.url)

    const callbackUrl = await pendingRedirect

    if (!callbackUrl) {
      return { cancelled: true }
    }

    // 🚨 NÃO FAZER exchange aqui
    // O backend (/auth/callback) já faz isso

    return { cancelled: false }
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
