'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [error, setError] = useState<string | null>(null)
  const loginInFlightRef = useRef(false)
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

          return
        }

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
          setError('Estamos finalizando seu acesso. Tente novamente em alguns segundos.')
          return
        }

        router.refresh()
        if (profile.onboarding_completed === false) {
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

  const handleLogin = async () => {
    if (loading || loginInFlightRef.current) return

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <h1 className="text-2xl font-bold text-center text-white">Entrar</h1>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

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
          disabled={loading}
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
