'use client'

import { AlertTriangle, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  title?: string
  description?: string
}

export default function LockedCard({
  title = 'Atenção',
  description = 'Este conteúdo possui alertas importantes.',
}: Props) {
  const router = useRouter()

  return (
    <div className="max-w-xl mx-auto mt-12 bg-black/70 border border-[#D4AF37]/50 rounded-2xl p-6 text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="w-10 h-10 text-[#D4AF37]" />
      </div>

      <h3 className="text-xl font-bold text-[#D4AF37] mb-2">
        {title}
      </h3>

      <p className="text-gray-300 mb-6">
        {description}
        <br />
        Desbloqueie para ver detalhes completos.
      </p>

      <button
        onClick={() => router.push('/planos')}
        className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-bold px-6 py-3 rounded-xl hover:brightness-110"
      >
        <Lock className="w-4 h-4" />
        Ver Planos
      </button>
    </div>
  )
}
