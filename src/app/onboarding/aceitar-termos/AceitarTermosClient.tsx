'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'

export default function AceitarTermosClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextPath = searchParams.get('next') || '/signup'

  const [termos, setTermos] = useState(false)
  const [privacidade, setPrivacidade] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = () => {
    if (!termos || !privacidade) {
      setError('Você precisa aceitar os termos para continuar.')
      return
    }

    localStorage.setItem(
      'confia_termos_aceite',
      JSON.stringify({
        termosAceitos: true,
        privacidadeAceita: true,
        acceptedAt: new Date().toISOString(),
      })
    )

    router.replace(nextPath)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-[#D4AF37] rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <Shield className="mx-auto text-[#D4AF37]" size={36} />
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Aceite dos Termos
          </h1>
          <p className="text-sm text-gray-400">
            Para continuar, confirme que leu e concorda com nossos termos.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-300 border border-red-700 bg-red-950/60 px-4 py-2 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={termos}
              onChange={(e) => setTermos(e.target.checked)}
            />
            Li e aceito os{' '}
            <span className="text-[#D4AF37] underline cursor-pointer">
              Termos de Uso
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privacidade}
              onChange={(e) => setPrivacidade(e.target.checked)}
            />
            Li e aceito a{' '}
            <span className="text-[#D4AF37] underline cursor-pointer">
              Política de Privacidade
            </span>
          </label>
        </div>

        <Button
          onClick={handleContinue}
          className="w-full bg-[#D4AF37] text-black hover:bg-[#c9a634]"
        >
          Aceitar e continuar
        </Button>
      </div>
    </div>
  )
}
