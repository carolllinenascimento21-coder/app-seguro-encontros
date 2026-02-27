'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createSupabaseClient()

    if (!supabase) {
      setError('Serviço indisponível no momento. Tente novamente mais tarde.')
      setLoading(false)
      return
    }

    const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBase}/update-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSuccess(
      'Se existir uma conta para esse e-mail, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e spam.'
    )
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <h1 className="text-2xl font-bold text-center text-white">Redefinir senha</h1>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-700 bg-green-950/60 px-4 py-2 text-sm text-green-200 text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634] disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Lembrou sua senha?{' '}
          <Link href="/login" className="font-semibold text-[#D4AF37] hover:underline">
            Voltar para login
          </Link>
        </p>
      </div>
    </div>
  )
}
