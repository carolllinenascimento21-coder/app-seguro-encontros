'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const supabase = createSupabaseBrowserClient();

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [termsOk, setTermsOk] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const storedAcceptance = localStorage.getItem('confia_termos_aceite')
    if (!storedAcceptance) {
      router.replace('/aceitar-termos?next=/signup')
      return
    }

    try {
      const aceite = JSON.parse(storedAcceptance)
      if (aceite?.termosAceitos && aceite?.privacidadeAceita) {
        setTermsOk(true)
        return
      }
    } catch (error) {
      // Caso o JSON esteja corrompido, força o fluxo correto
    }

    router.replace('/aceitar-termos?next=/signup')
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!gender) {
      setErrorMessage('Selecione seu gênero para continuar.')
      return
    }

    if (gender.toLowerCase() !== 'female') {
      setErrorMessage(
        'Este aplicativo é exclusivo para mulheres; não é possível concluir o cadastro.'
      )
      return
    }

    setErrorMessage('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          gender,
          selfie_verified: false,
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    const userEmail = data.user?.email ?? email

    if (!userId) {
      setErrorMessage('Não foi possível identificar o usuário criado.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email: userEmail,
      gender,
      selfie_verified: false,
      selfie_verified_at: null,
    })

    if (profileError) {
      setErrorMessage(profileError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/verification-pending')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Cadastrar</h2>
          <p className="text-muted-foreground">
            Crie sua conta e conclua a selfie antes de acessar o app completo.
          </p>
        </div>
        {errorMessage && (
          <div className="rounded-md bg-red-950/60 border border-red-900 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
        <form
          onSubmit={handleSignup}
          className="space-y-6"
          aria-disabled={!termsOk}
        >
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!termsOk}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gênero</Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              disabled={!termsOk}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="" disabled>
                Selecione seu gênero
              </option>
              <option value="female">Mulher</option>
              <option value="other">Outro (não permitido)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!termsOk}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !termsOk || !gender}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
        <p className="text-center">
          Já tem conta? <Link href="/login" className="text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
