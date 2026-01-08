'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/billing'

const supabase = createSupabaseClient()

export default function SignupPage() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [termsOk, setTermsOk] = useState(false)

  // 🔒 Garante aceite dos termos
  useEffect(() => {
    const stored = localStorage.getItem('confia_termos_aceite')

    if (!stored) {
      router.replace('/onboarding/aceitar-termos?next=/signup')
      return
    }

    try {
      const aceite = JSON.parse(stored)
      if (aceite?.termosAceitos && aceite?.privacidadeAceita) {
        setTermsOk(true)
        return
      }
    } catch {}

    router.replace('/onboarding/aceitar-termos?next=/signup')
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome || !email || !telefone || !password || !confirmPassword) {
      setErrorMessage('Preencha todos os campos.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        data: {
          nome,
          telefone,
          termos_aceitos: true,
          onboarding_completed: false,
          selfie_verified: false,
        },
        phone: telefone,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setSuccessMessage(
      'Conta criada com sucesso. Verifique seu e-mail para confirmar o cadastro antes de entrar.'
    )

    setLoading(false)

    setTimeout(() => {
      router.replace('/login')
    }, 4000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[#D4AF37] p-8">

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-[#D4AF37]">Criar conta</h2>
          <p className="text-sm text-gray-400">
            Crie sua conta com segurança
          </p>
        </div>

        {errorMessage && (
          <div className="border border-red-700 bg-red-950/60 p-3 text-red-200 rounded-md">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="border border-green-700 bg-green-950/60 p-3 text-green-200 rounded-md">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              disabled={!termsOk}
              className="bg-black border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!termsOk}
              className="bg-black border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              disabled={!termsOk}
              className="bg-black border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!termsOk}
              className="bg-black border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={!termsOk}
              className="bg-black border-[#D4AF37]"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !termsOk}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl"
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Já tem conta?{' '}
          <Link href="/login" className="text-[#D4AF37] hover:underline">
            Entrar
          </Link>
        </p>

      </div>
    </div>
  )
}
