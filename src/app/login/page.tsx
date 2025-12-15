'use client'

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const supabase = createClientComponentClient();

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const upsertProfile = async (payload: { id: string; email: string | null }) => {
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('selfie_verified')
      .single()

    if (upsertError) {
      const emailColumnMissing =
        upsertError.message?.toLowerCase().includes('email') &&
        upsertError.message?.toLowerCase().includes('profiles')

      if (!emailColumnMissing) {
        throw upsertError
      }

      const { email: _email, ...profileWithoutEmail } = payload
      const { data: fallbackProfile, error: retryError } = await supabase
        .from('profiles')
        .upsert(profileWithoutEmail, { onConflict: 'id' })
        .select('selfie_verified')
        .single()

      if (retryError) {
        throw retryError
      }

      return fallbackProfile?.selfie_verified ?? false
    }

    return profile?.selfie_verified ?? false
  }

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) return

      const user = data.session?.user
      if (!user) return

      try {
        const selfieVerified = await upsertProfile({ id: user.id, email: user.email })
        router.replace(selfieVerified ? '/perfil' : '/verificacao-selfie')
      } catch (err) {
        console.error('Falha ao validar perfil existente:', err)
      }
    }

    redirectIfAuthenticated()
  }, [router])

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      alert(signInError.message)
      setLoading(false)
      return
    }

    const user = signInData.user

    if (!user) {
      alert('Não foi possível recuperar o usuário autenticado.')
      setLoading(false)
      return
    }

    let selfieVerified = false
    try {
      selfieVerified = await upsertProfile({ id: user.id, email: user.email })
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar perfil')
      setLoading(false)
      return
    }
    if (selfieVerified) {
      router.push('/perfil')
    } else {
      router.push('/verificacao-selfie')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Entrar</h2>
          <p className="text-muted-foreground">Acesse sua conta</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="text-center">
          Não tem conta? <Link href="/signup" className="text-primary">Cadastrar</Link>
        </p>
      </div>
    </div>
  )
}
