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
            Antes de confiar
          </p>

          <h1 className="text-white text-2xl font-bold mt-2 leading-snug">
            Veja se outras mulheres já confiaram
          </h1>

          <p className="text-[#EFD9A7] text-sm mt-4">
            Informação pode evitar situações que você nunca deveria passar.
          </p>
        </div>

        {/* Bloco de identificação */}
        <div className="space-y-4">
          <p className="text-[#EFD9A7] text-sm">
            Se você já:
          </p>

          <ul className="space-y-2 text-sm text-[#EFD9A7]">
            <li>• Ignorou um alerta interno</li>
            <li>• Confiou apenas no que te contaram</li>
            <li>• Pensou “se eu soubesse antes…”</li>
          </ul>

          <p className="text-[#EFD9A7] text-sm">
            Você não está sozinha.  
            O problema nunca foi você — foi a falta de informação.
          </p>
        </div>

        {/* Proposta de valor */}
        <div className="border border-[#D4AF37]/40 rounded-2xl p-6 space-y-3">
          <p className="text-white font-semibold text-center">
            O Confia+ é uma ferramenta de proteção feminina
          </p>

          <p className="text-[#EFD9A7] text-sm text-center">
            Baseada em experiências reais, uso responsável e prevenção.
          </p>
        </div>

        {/* CTA principal */}
        <Button
          onClick={() => router.push('/onboarding')}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black py-6 rounded-2xl font-bold text-base"
        >
          Continuar
        </Button>

        {/* CTA secundário */}
        <div className="flex items-center justify-center gap-2 text-[#EFD9A7] text-xs">
          <Crown className="w-4 h-4 text-[#D4AF37]" />
          <span>Você pode usar gratuitamente no início</span>
        </div>

        {/* Rodapé emocional */}
        <p className="text-center text-xs text-[#EFD9A7]/70 mt-4">
          Informação não tira sua liberdade.  
          Informação te devolve o controle.
        </p>
      </div>
    </div>
  )
}
