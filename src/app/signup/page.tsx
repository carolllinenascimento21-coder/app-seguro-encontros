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
  const [gender, setGender] = useState('female')
  const [selfie, setSelfie] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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
    } catch {}

    router.replace('/aceitar-termos?next=/signup')
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsOk) return

    if (!fullName || !birthDate || !email || !password || !confirmPassword) {
      setErrorMessage('Preencha todos os campos.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.')
      return
    }

    if (gender !== 'female') {
      setErrorMessage('Este aplicativo é exclusivo para mulheres.')
      return
    }

    if (!selfie) {
      setErrorMessage('É obrigatório enviar uma selfie.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          birth_date: birthDate,
          gender: 'female',
          selfie_verified: false,
          onboarding_completed: false,
        },
      },
    })

    if (error || !data.user) {
      setErrorMessage(error?.message || 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // Upload da selfie
    const fileExt = selfie.name.split('.').pop()
    const filePath = `selfies/${data.user.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(filePath, selfie, { upsert: true })

    if (uploadError) {
      setErrorMessage('Conta criada, mas erro ao enviar selfie.')
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
          <h2 className="text-3xl font-bold">Criar conta</h2>
          <p className="text-muted-foreground">
            Preencha seus dados e envie uma selfie para sua segurança.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-950/60 border border-red-900 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <Label>Nome completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!termsOk}
              required
            />
          </div>

          <div>
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={!termsOk}
              required
            />
          </div>

          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!termsOk}
              required
            />
          </div>

          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!termsOk}
              required
            />
          </div>

          <div>
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!termsOk}
              required
            />
          </div>

          <div>
            <Label>Gênero</Label>
            <Input value="Mulher" disabled />
          </div>

          <div>
            <Label>Selfie (obrigatória)</Label>
            <Input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => setSelfie(e.target.files?.[0] || null)}
              disabled={!termsOk}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="text-center text-sm">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
