'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

function readHashParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams()
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  return new URLSearchParams(hash)
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const code = searchParams.get('code')

  useEffect(() => {
    const prepareRecoverySession = async () => {
      const supabase = createSupabaseClient()

      if (!supabase) {
        setError('Serviço indisponível no momento. Tente novamente mais tarde.')
        setInvalidLink(true)
        setLoadingSession(false)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError('Link inválido ou expirado. Solicite uma nova redefinição de senha.')
          setInvalidLink(true)
          setLoadingSession(false)
          return
        }
      } else {
        const hashParams = readHashParams()
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            setError('Link inválido ou expirado. Solicite uma nova redefinição de senha.')
            setInvalidLink(true)
            setLoadingSession(false)
            return
          }
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (!session) {
            setError('Link inválido ou expirado. Solicite uma nova redefinição de senha.')
            setInvalidLink(true)
            setLoadingSession(false)
            return
          }
        }
      }

      setLoadingSession(false)
    }

    prepareRecoverySession()
  }, [code])

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      setError('Serviço indisponível no momento. Tente novamente mais tarde.')
      return
    }

    setLoadingUpdate(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoadingUpdate(false)
      return
    }

    setSuccess('Senha atualizada com sucesso. Você já pode entrar com sua nova senha.')
    setLoadingUpdate(false)

    setTimeout(() => {
      router.replace('/login')
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <h1 className="text-2xl font-bold text-center text-white">Atualizar senha</h1>

        {loadingSession && (
          <div className="rounded-md border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#f3df95] text-center">
            Validando link de recuperação...
          </div>
        )}

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

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loadingSession || invalidLink || loadingUpdate}
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
          />

          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loadingSession || invalidLink || loadingUpdate}
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loadingSession || invalidLink || loadingUpdate}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634] disabled:opacity-50"
          >
            {loadingUpdate ? 'Atualizando...' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          <Link href="/reset-password" className="font-semibold text-[#D4AF37] hover:underline">
            Solicitar novo link
          </Link>
        </p>
      </div>
    </div>
  )
}
