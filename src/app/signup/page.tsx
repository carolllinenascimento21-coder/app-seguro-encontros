'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const supabase = createSupabaseClient()

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [termsOk, setTermsOk] = useState(false)

  // 🔒 Garante que termos foram aceitos antes do cadastro
  useEffect(() => {
    const storedAcceptance = localStorage.getItem('confia_termos_aceite')

    if (!storedAcceptance) {
      router.replace('/onboarding/aceitar-termos?next=/signup')
      return
    }

    try {
      const aceite = JSON.parse(storedAcceptance)
      if (aceite?.termosAceitos && aceite?.privacidadeAceita) {
        setTermsOk(true)
        return
      }
    } catch {}

    router.replace('/onboarding/aceitar-termos?next=/signup')
  }, [router])

 const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!fullName || !birthDate || !email || !password || !confirmPassword) {
    setErrorMessage('Preencha todos os campos.')
    return
  }

  if (password !== confirmPassword) {
    setErrorMessage('As senhas não coincidem.')
    return
  }

  setLoading(true)
  setErrorMessage('')

  // 1️⃣ Cria o usuário
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error || !data.user) {
    setErrorMessage(error?.message || 'Erro ao criar conta')
    setLoading(false)
    return
  }

  // 2️⃣ Cria o perfil
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      full_name: fullName,
      birth_date: birthDate,
      gender: 'female',
      selfie_verified: false,
      termos_aceitos: true,
      onboarding_completed: false,
    })

  if (profileError) {
    setErrorMessage('Conta criada, mas erro ao criar perfil.')
    setLoading(false)
    return
  }

  setLoading(false)
  router.push('/verification-pending')
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[#D4AF37] p-8">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-[#D4AF37]">
            Criar conta
          </h2>
          <p className="text-sm text-gray-400">
            Preencha seus dados para criar sua conta com segurança.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <Label className="text-gray-300">Nome completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!termsOk}
              required
              className="bg-black border-[#D4AF37] text-white placeholder:text-gray-500"
            />
          </div>

          <div>
            <Label className="text-gray-300">Data de nascimento</Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={!termsOk}
              required
              className="bg-black border-[#D4AF37] text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!termsOk}
              required
              className="bg-black border-[#D4AF37] text-white placeholder:text-gray-500"
            />
          </div>

          <div>
            <Label className="text-gray-300">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!termsOk}
              required
              className="bg-black border-[#D4AF37] text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Confirmar senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!termsOk}
              required
              className="bg-black border-[#D4AF37] text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300">Gênero</Label>
            <Input
              value="Mulher"
              disabled
              className="bg-black border-[#D4AF37] text-[#D4AF37]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !termsOk}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black hover:bg-[#c9a634] disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-semibold text-[#D4AF37] hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
