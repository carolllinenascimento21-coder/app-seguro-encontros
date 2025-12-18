'use client'

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, FormEvent } from 'react'
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

  const handleLogin = async () => {
  setLoading(true)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error(error.message)
    setLoading(false)
    return
  }

  // 🔴 ESSA LINHA ESTÁ FALTANDO HOJE
  router.replace('/onboarding')
}


    if (!signInData.user) {
      alert('Não foi possível recuperar o usuário autenticado.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.replace('/')
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
