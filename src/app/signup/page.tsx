'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from "@/lib/supabase";
const supabase = createSupabaseBrowserClient();
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [termsOk, setTermsOk] = useState(false)

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
    if (gender.toLowerCase() !== 'female') {
      alert('Este aplicativo é exclusivo para mulheres; não é possível concluir o cadastro.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
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
      alert(error.message)
    } else {
      alert('Verifique seu e-mail para confirmar a conta')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Cadastrar</h2>
          <p className="text-muted-foreground">Crie sua conta</p>
        </div>
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
