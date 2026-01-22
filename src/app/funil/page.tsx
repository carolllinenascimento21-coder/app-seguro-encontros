'use client'

import { useRouter } from 'next/navigation'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export const dynamic = 'force-dynamic'
export default function FunilPage() {
  const router = useRouter()

  // Marca que a usuária passou pelo funil (evita looping no futuro)
  useEffect(() => {
    localStorage.setItem('funil_visitado', 'true')
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Logo */}
        <img
          src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png"
          alt="Confia+ Logo"
          className="w-44 mx-auto"
        />

        {/* Headline principal */}
        <div className="border-2 border-[#D4AF37] rounded-3xl p-8 text-center">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-wide">
            Antes de se envolver
          </p>

          <h1 className="text-white text-2xl font-bold mt-2 leading-snug">
            Clareza para decidir com consciência
          </h1>

          <p className="text-[#EFD9A7] text-sm mt-4">
            Informação confiável preserva sua segurança emocional
            e o seu tempo.
          </p>
        </div>

        {/* CTA principal */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black py-6 rounded-2xl font-bold text-base"
          >
            Continuar
          </Button>

          <div className="flex items-center justify-center gap-2 text-[#EFD9A7] text-xs">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span>Você pode usar gratuitamente no início</span>
          </div>
        </div>

        {/* Bloco de identificação */}
        <div className="space-y-4">
          <p className="text-[#EFD9A7] text-sm">
            Se você já ignorou um alerta interno.
          </p>

          <p className="text-[#EFD9A7] text-sm">
            Se confiou apenas no que foi dito.
          </p>

          <p className="text-[#EFD9A7] text-sm">
            Se pensou “eu precisava de mais informação”.
          </p>
        </div>

        {/* Contexto do problema */}
        <div className="space-y-3">
          <p className="text-[#EFD9A7] text-sm">
            Você não está sozinha.
          </p>
          <p className="text-[#EFD9A7] text-sm">
            O problema sempre foi a falta de histórico confiável.
          </p>
        </div>

        {/* Desejo */}
        <div className="space-y-3">
          <p className="text-white font-semibold text-center">
            Clareza antes de se envolver
          </p>
          <p className="text-[#EFD9A7] text-sm text-center">
            Decisão consciente — com responsabilidade emocional.
          </p>
        </div>

        {/* Como funciona */}
        <div className="border border-[#D4AF37]/40 rounded-2xl p-6 space-y-3 text-center">
          <p className="text-white font-semibold">
            Consulte avaliações
          </p>
          <p className="text-[#EFD9A7] text-sm">
            Entenda o histórico com calma.
          </p>
          <p className="text-[#EFD9A7] text-sm">
            Decida com informação.
          </p>
        </div>

        {/* Diferenciais */}
        <div className="space-y-3 text-center">
          <p className="text-white font-semibold">
            Confia+ não é app de relacionamento
          </p>
          <p className="text-[#EFD9A7] text-sm">
            Homens não têm perfil.  
            Mulheres consultam avaliações feitas por outras mulheres.
          </p>
        </div>

        {/* CTA final */}
        <div className="space-y-4 pt-2">
          <Button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black py-6 rounded-2xl font-bold text-base"
          >
            Quero clareza agora
          </Button>
          <p className="text-center text-xs text-[#EFD9A7]/70">
            Informação não tira sua liberdade — devolve o controle.
          </p>
        </div>
      </div>
    </div>
  )
}
