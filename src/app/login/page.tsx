'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/browser'
import { ensureProfileForUser } from '@/lib/profile-utils'
import { isAuthSessionMissingError } from '@/lib/auth-session'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loginInFlightRef = useRef(false)

  const handleLogin = async () => {
    // 🔒 evita múltiplos cliques/race de estado (CRÍTICO)
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
      // 🔥 LOGIN
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
          setError(
            'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.'
          )
        } else {
          setError('E-mail ou senha inválidos.')
        }

        return
      }

      // 🔥 VALIDA SESSÃO
      if (!data.session?.access_token || !data.session.refresh_token) {
        console.error('Login sem sessão válida:', {
          hasSession: Boolean(data.session),
        })
        setError('Não foi possível iniciar sua sessão. Tente novamente.')
        return
      }

      // 🔥 SINCRONIZA COM SERVER
      const syncResponse = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // ESSENCIAL PARA iOS
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      })

      if (!syncResponse.ok) {
        const syncResult = await syncResponse
          .json()
          .catch(() => ({ error: 'unknown_error' }))

        console.error('Falha ao sincronizar sessão:', syncResult)

        // 🔥 CORREÇÃO CRÍTICA (resolve iOS)
        await supabase.auth.signOut()

        setError('Falha ao persistir sessão. Tente novamente.')
        return
      }

      // 🔥 PEQUENO DELAY (resolve iOS / cookie timing)
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 🔥 CARREGA USUÁRIO
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError && !isAuthSessionMissingError(userError)) {
        console.error('Erro ao carregar usuário:', userError)
      }

      if (user) {
        const { profile, error: profileError } = await ensureProfileForUser(
          supabase,
          user
        )

        if (profileError) {
          console.error('Erro ao garantir perfil:', profileError)
        }

        // 🔥 FLUXO DE ONBOARDING
        if (
          profile?.onboarding_completed === false ||
          profile?.onboarding_completed === null
        ) {
          router.refresh()
          router.replace('/onboarding/selfie')
          return
        }
      }

      // 🔥 REDIRECIONAMENTO FINAL
      router.refresh()
      router.replace('/home')
    } catch (err) {
      console.error('Erro inesperado no login:', err)

      // 🔥 fallback de segurança
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
        <h1 className="text-2xl font-bold text-center text-white">
          Entrar
        </h1>

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
