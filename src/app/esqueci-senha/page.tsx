'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/browser'

const SUCCESS_MESSAGE =
  'Se existir uma conta com esse e-mail, enviaremos instruções de redefinição em instantes.'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    setError(null)
    setMessage(null)

    if (!normalizedEmail) {
      setError('Informe seu e-mail.')
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um e-mail válido.')
      return
    }

    setLoading(true)

    try {
      const redirectTo = new URL('/auth/recovery', window.location.origin)

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectTo.toString(),
      })

      if (resetError) {
        console.error('Erro ao solicitar recuperação de senha:', resetError)
        setError('Não foi possível enviar as instruções agora. Tente novamente em alguns instantes.')
        return
      }

      setMessage(SUCCESS_MESSAGE)
      setEmail('')
    } catch (unexpectedError) {
      console.error('Erro inesperado ao solicitar recuperação de senha:', unexpectedError)
      setError('Não foi possível enviar as instruções agora. Tente novamente em alguns instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <section className="w-full max-w-sm space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-sm text-gray-400">
            Informe seu e-mail para receber o link de redefinição.
          </p>
        </header>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634] disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar instruções'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Lembrou sua senha?{' '}
          <Link href="/login" className="font-semibold text-[#D4AF37] hover:underline">
            Voltar para entrar
          </Link>
        </p>
      </section>
    </main>
  )
}
