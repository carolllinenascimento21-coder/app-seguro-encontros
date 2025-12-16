'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(true)

  // 🔐 Se já estiver logada, não mostra onboarding
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/home')
      } else {
        setLoading(false)
      }
    }
    checkSession()
  }, [router])

  if (loading) return null

  const handleGoogleLogin = async () => {
    if (!agreed) {
      alert('Por favor, aceite os termos para continuar.')
      return
    }

    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/aceitar-termos?next=/home')}`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })
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

        <Button
          onClick={handleGoogleLogin}
          disabled={!agreed}
          className="w-full bg-[#D4AF37] text-black py-6 rounded-2xl"
        >
          Continuar com Google
        </Button>

        <div className="text-center text-sm text-gray-400">ou</div>

        <Button
          onClick={() =>
            router.push(
              `/aceitar-termos?next=${encodeURIComponent('/cadastro')}`
            )
          }
          variant="outline"
          className="w-full border-[#D4AF37] text-[#D4AF37] py-6 rounded-2xl"
        >
          Criar conta com e-mail
        </Button>

        <p className="text-center text-sm text-[#EFD9A7]">
          Já tem uma conta?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-[#D4AF37] font-semibold hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
