'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureProfileForUser } from '@/lib/profile-utils'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // ✅ Tratamento específico para e-mail não confirmado
      if (
        error.message.toLowerCase().includes('email') &&
        error.message.toLowerCase().includes('confirm')
      ) {
        setError(
          'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam e clique no link de confirmação.'
        )
      } else {
        setError('E-mail ou senha inválidos.')
      }

      setLoading(false)
      return
    }

    // ✅ Login ok → garante perfil completo antes do fluxo de navegação
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user) {
      const { error: profileError } = await ensureProfileForUser(supabase, user)
      if (profileError) {
        console.error('Erro ao garantir perfil no login:', profileError)
      }
    }

    // ✅ Login ok → controle segue para o middleware
    router.replace('/home')
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
