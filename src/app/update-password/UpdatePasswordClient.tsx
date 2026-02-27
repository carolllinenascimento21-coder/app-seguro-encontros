'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

export default function UpdatePasswordClient() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase não configurado no cliente.')
      return
    }

    const exchangeSession = async () => {
      const code = searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
        }
        return
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken || !refreshToken) {
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(sessionError.message)
      }
    }

    exchangeSession()
  }, [searchParams, supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError(null)
    setMessage(null)

    if (!supabase) {
      setError('Supabase não configurado no cliente.')
      return
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setIsLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Senha atualizada com sucesso. Você já pode fazer login com a nova senha.')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Atualizar senha</h1>

        <div className="space-y-2">
          <label className="text-sm" htmlFor="password">Nova senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm" htmlFor="confirm-password">Confirmar senha</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-green-400">{message}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-yellow-500 px-3 py-2 font-medium text-black disabled:opacity-60"
        >
          {isLoading ? 'Atualizando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  )
}
