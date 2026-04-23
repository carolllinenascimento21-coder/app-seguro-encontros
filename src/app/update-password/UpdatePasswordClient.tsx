'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/browser'

type RecoveryStatus = 'validating' | 'ready' | 'invalid' | 'success'

function getHashParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams()
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

export default function UpdatePasswordClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<RecoveryStatus>('validating')

  useEffect(() => {
    const exchangeSession = async () => {
      setError(null)

      try {
        const providerError = searchParams.get('error_description') ?? searchParams.get('error')
        if (providerError) {
          setStatus('invalid')
          setError('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.')
          return
        }

        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Erro ao validar link de redefinição por code:', exchangeError)
            setStatus('invalid')
            setError('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.')
            return
          }

          setStatus('ready')
          return
        }

        const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token')
        const typeParam = searchParams.get('type')

        if (tokenHash && typeParam === 'recovery') {
          const { error: verifyOtpError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          })

          if (verifyOtpError) {
            console.error('Erro ao validar link de redefinição por token hash:', verifyOtpError)
            setStatus('invalid')
            setError('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.')
            return
          }

          setStatus('ready')
          return
        }

        const hashParams = getHashParams()
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Erro ao validar link de redefinição por token:', sessionError)
            setStatus('invalid')
            setError('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.')
            return
          }

          setStatus('ready')
          return
        }


        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession()

        if (existingSession) {
          setStatus('ready')
          return
        }

        setStatus('invalid')
        setError('Link de redefinição inválido. Solicite uma nova recuperação de senha.')
      } catch (unexpectedError) {
        console.error('Erro inesperado ao preparar redefinição de senha:', unexpectedError)
        setStatus('invalid')
        setError('Não foi possível validar seu link de redefinição. Tente novamente.')
      }
    }

    void exchangeSession()
  }, [searchParams, supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError)
        setError('Não foi possível atualizar sua senha. Solicite um novo link e tente novamente.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      let destination = '/login'

      if (session?.access_token && session.refresh_token) {
        const syncResponse = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        })

        if (syncResponse.ok) {
          destination = '/home'
        }
      }

      setStatus('success')
      setMessage('Senha atualizada com sucesso. Redirecionando...')
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        router.replace(destination)
      }, 1200)
    } catch (unexpectedError) {
      console.error('Erro inesperado ao atualizar senha:', unexpectedError)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[#D4AF37] p-8"
      >
        <h1 className="text-2xl font-bold text-center text-white">Definir nova senha</h1>

        {status === 'validating' ? (
          <div className="rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#f1d271] text-center">
            Validando link de recuperação...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-md border border-green-700 bg-green-950/60 px-4 py-2 text-sm text-green-200 text-center">
            {message}
          </div>
        ) : null}

        {status === 'invalid' ? (
          <p className="text-center text-sm text-gray-400">
            <Link href="/esqueci-senha" className="font-semibold text-[#D4AF37] hover:underline">
              Solicitar novo link
            </Link>
          </p>
        ) : null}

        <fieldset
          className="space-y-4"
          disabled={isLoading || status !== 'ready'}
        >
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="password">
              Nova senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="confirm-password">
              Confirmar senha
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || status !== 'ready'}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634] disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </fieldset>

        <p className="text-center text-sm text-gray-400">
          <Link href="/login" className="font-semibold text-[#D4AF37] hover:underline">
            Voltar para login
          </Link>
        </p>
      </form>
    </main>
  )
}
