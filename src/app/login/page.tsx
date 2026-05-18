'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Apple } from 'lucide-react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/browser'
import { isAuthSessionMissingError } from '@/lib/auth-session'
import {
  clearRememberedLoginEmail,
  readRememberedLoginEmail,
  rememberLoginEmail,
} from '@/lib/auth-remember'
import { ensureProfileForUser } from '@/lib/profile-utils'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [redirectingAfterLogin, setRedirectingAfterLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loginInFlightRef = useRef(false)
  const oauthInFlightRef = useRef(false)
  const oauthCheckRanRef = useRef(false)
  const resolvingRouteRef = useRef(false)
  const shouldRetryRef = useRef(false)

  const resolvePostLoginRoute = useCallback(async () => {
    if (resolvingRouteRef.current) {
      shouldRetryRef.current = true
      return
    }

    resolvingRouteRef.current = true

    try {
      const supabase = createSupabaseClient()
      const maxAttempts = 4

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError && !isAuthSessionMissingError(sessionError)) {
          console.error('Erro ao validar persistência da sessão na tela de login:', sessionError)
        }

        if (!session) {
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            continue
          }

          setRedirectingAfterLogin(false)
          return
        }

        setRedirectingAfterLogin(true)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError && !isAuthSessionMissingError(userError)) {
          console.error('Erro ao validar usuário na tela de login:', userError)
        }

        if (!user) {
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            continue
          }

          setRedirectingAfterLogin(false)
          return
        }

        const { profile, error: profileError } = await ensureProfileForUser(supabase, user)

        if (profileError) {
          console.error('Erro ao buscar perfil no login:', profileError)
        }

        if (!profile) {
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            continue
          }

          console.warn('Perfil ainda indisponível após tentativas de sincronização pós-login.')
          setRedirectingAfterLogin(false)
          setError('Estamos finalizando seu acesso. Tente novamente em alguns segundos.')
          return
        }

        router.refresh()

        const needsSelfieOnboarding =
          profile.onboarding_completed !== true || profile.selfie_verified !== true

        if (needsSelfieOnboarding) {
          router.replace('/onboarding/selfie')
          return
        }

        router.replace('/home')
        return
      }
    } finally {
      resolvingRouteRef.current = false

      if (shouldRetryRef.current) {
        shouldRetryRef.current = false
        void resolvePostLoginRoute()
      }
    }
  }, [router])

  useEffect(() => {
    const rememberedEmail = readRememberedLoginEmail()

    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (oauthCheckRanRef.current) return

    oauthCheckRanRef.current = true

    const runOAuthLandingCheck = async () => {
      await resolvePostLoginRoute()
    }

    runOAuthLandingCheck()
  }, [resolvePostLoginRoute])

  useEffect(() => {
    const supabase = createSupabaseClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') {
        void resolvePostLoginRoute()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [resolvePostLoginRoute])

  useEffect(() => {
    const resetOAuthState = () => {
      oauthInFlightRef.current = false
      setOauthLoading(null)
    }

    window.addEventListener('pageshow', resetOAuthState)
    window.addEventListener('focus', resetOAuthState)

    return () => {
      window.removeEventListener('pageshow', resetOAuthState)
      window.removeEventListener('focus', resetOAuthState)
    }
  }, [])

  const startOAuth = (provider: 'google' | 'apple') => {
    if (loading || redirectingAfterLogin || oauthInFlightRef.current) return

    oauthInFlightRef.current = true
    setOauthLoading(provider)
    setError(null)

    try {
      const currentParams = new URLSearchParams(window.location.search)
      const nextPath = currentParams.get('next') || '/login'
      const oauthEntryUrl = new URL(`/api/auth/${provider}`, window.location.origin)

      oauthEntryUrl.searchParams.set('next', nextPath)

      const passthroughParams = [
        'return_mode',
        'return_to',
        'redirect_to',
        'platform',
        'flow_id',
        'state',
        'nonce',
      ]

      for (const param of passthroughParams) {
        const value = currentParams.get(param)

        if (value) {
          oauthEntryUrl.searchParams.set(param, value)
        }
      }

      window.location.assign(oauthEntryUrl.toString())
    } catch (err) {
      console.error(`Erro ao iniciar login com ${provider}:`, err)
      oauthInFlightRef.current = false
      setOauthLoading(null)
      setError('Não foi possível iniciar o login social. Tente novamente.')
    }
  }

  const signInWithGoogle = () => startOAuth('google')

  const signInWithApple = () => startOAuth('apple')

  const handleLogin = async () => {
    if (loading || redirectingAfterLogin || oauthInFlightRef.current || loginInFlightRef.current) return

    loginInFlightRef.current = true
    setLoading(true)
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Informe e-mail e senha.')
      setLoading(false)
      loginInFlightRef.current = false
      return
    }

    const supabase = createSupabaseClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        console.error('Erro no login:', error)

        if (
          error.message.toLowerCase().includes('email') &&
          error.message.toLowerCase().includes('confirm')
        ) {
          setError('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.')
        } else {
          setError('E-mail ou senha inválidos.')
        }

        return
      }

      if (!data.session?.access_token || !data.session.refresh_token) {
        console.error('Login sem sessão válida:', {
          hasSession: Boolean(data.session),
        })
        setError('Não foi possível iniciar sua sessão. Tente novamente.')
        return
      }

      const syncResponse = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      })

      if (!syncResponse.ok) {
        const syncResult = await syncResponse.json().catch(() => ({ error: 'unknown_error' }))

        console.error('Falha ao sincronizar sessão:', syncResult)

        await supabase.auth.signOut()
        setError('Falha ao persistir sessão. Tente novamente.')
        return
      }

      if (rememberMe) {
        rememberLoginEmail(email)
      } else {
        clearRememberedLoginEmail()
      }

      await new Promise((resolve) => setTimeout(resolve, 150))

      await resolvePostLoginRoute()
    } catch (err) {
      console.error('Erro inesperado no login:', err)

      try {
        await supabase.auth.signOut()
      } catch {}

      setError('Erro inesperado. Tente novamente.')
    } finally {
      loginInFlightRef.current = false
      setLoading(false)
    }
  }

  const isFormDisabled = loading || oauthLoading !== null || redirectingAfterLogin

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black px-4">
      {redirectingAfterLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 text-center backdrop-blur-sm" role="status" aria-live="polite">
          <div className="space-y-4 rounded-2xl border border-[#D4AF37] bg-black p-8 text-white shadow-2xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37]" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-[#D4AF37]">Carregando sua conta...</p>
              <p className="text-sm text-gray-300">Estamos abrindo a Home com seus dados.</p>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <h1 className="text-2xl font-bold text-center text-white">Entrar</h1>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={signInWithApple}
            disabled={isFormDisabled}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white bg-white py-3 font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Continuar com Apple"
          >
            <Apple className="h-5 w-5" aria-hidden="true" />
            {oauthLoading === 'apple' ? 'Conectando com Apple...' : 'Continuar com Apple'}
          </button>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isFormDisabled}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D4AF37] bg-transparent py-3 font-semibold text-white transition hover:bg-[#D4AF37]/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Continuar com Google"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]"
              aria-hidden="true"
            >
              G
            </span>
            {oauthLoading === 'google' ? 'Conectando com Google...' : 'Continuar com Google'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-gray-500">
          <span className="h-px flex-1 bg-[#D4AF37]/40" />
          ou entre com e-mail
          <span className="h-px flex-1 bg-[#D4AF37]/40" />
        </div>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
        />

        <div className="-mt-2 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border border-[#D4AF37] bg-transparent accent-[#D4AF37]"
            />
            Lembrar meu e-mail
          </label>

          <Link href="/esqueci-senha" className="text-sm font-medium text-[#D4AF37] hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <button
          onClick={handleLogin}
          disabled={isFormDisabled}
          className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634] disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-gray-400">
          Ainda não tem conta?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="font-semibold text-[#D4AF37] hover:underline"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  )
}
