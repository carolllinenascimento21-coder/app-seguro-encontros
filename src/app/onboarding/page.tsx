'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [gender, setGender] = useState('')

  const validatePreconditions = () => {
    if (!agreed) {
      alert('Você precisa aceitar os termos para continuar.')
      return false
    }

    if (gender !== 'female') {
      alert('Este aplicativo é exclusivo para mulheres.')
      return false
    }

    return true
  }

  const handleGoogleLogin = async () => {
  if (!agreed) {
    alert('Por favor, aceite os termos para continuar.')
    return
  }

  if (gender !== 'female') {
    alert('Este aplicativo é exclusivo para mulheres.')
    return
  }

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      data: {
        gender: 'female',
      },
    },
  })
}


  const handleSignup = () => {
    if (!validatePreconditions()) return

    localStorage.setItem(
      'pre_onboarding',
      JSON.stringify({
        agreed: true,
        gender: 'female',
      })
    )

    router.push('/signup')
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => router.push('/planos')}
          className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-2 px-4 rounded-full"
        >
          <Crown className="w-4 h-4" />
          Ver Planos
        </button>
      </div>

      <div className="w-full max-w-md space-y-8">
        <img
          src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png"
          alt="Confia+ Logo"
          className="w-48 mx-auto"
        />

        <div className="border-2 border-[#D4AF37] rounded-3xl p-8">
          <p className="text-white text-2xl font-bold text-center">
            Ferramenta segura para mulheres
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
          <p className="text-sm text-[#EFD9A7]">
            Ao continuar, você confirma que tem mais de 18 anos e aceita os termos.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-[#EFD9A7] font-semibold">Gênero</p>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-[#EFD9A7]"
          >
            <option value="" className="bg-black text-[#EFD9A7]">
              Selecione seu gênero
            </option>
            <option value="female" className="bg-black text-[#EFD9A7]">
              Mulher
            </option>
            <option value="other" className="bg-black text-[#EFD9A7]">
              Outro (não permitido)
            </option>
          </select>
        </div>

        <Button
          onClick={handleGoogleLogin}
          disabled={!agreed || !gender}
          className="w-full bg-[#D4AF37] text-black py-6 rounded-2xl"
        >
          Continuar com Google
        </Button>

        <div className="text-center text-sm text-gray-400">ou</div>

        <Button
          onClick={handleSignup}
          variant="outline"
          className="w-full border-[#D4AF37] text-[#D4AF37] py-6 rounded-2xl"
        >
          Criar conta com e-mail
        </Button>

        <p className="text-center text-sm text-[#EFD9A7]">
          Já tem uma conta?{' '}
          <button
            onClick={handleLogin}
            className="text-[#D4AF37] font-semibold hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
