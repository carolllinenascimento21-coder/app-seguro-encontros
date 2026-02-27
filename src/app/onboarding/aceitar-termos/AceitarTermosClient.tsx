'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_NEXT_PATH = '/signup'

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath) return DEFAULT_NEXT_PATH
  if (!nextPath.startsWith('/')) return DEFAULT_NEXT_PATH
  if (nextPath.startsWith('//')) return DEFAULT_NEXT_PATH

  return nextPath
}

export default function AceitarTermosClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextPath = getSafeNextPath(searchParams.get('next'))
  const termsHref = `/termos?next=${encodeURIComponent(nextPath)}`
  const privacyHref = `/privacidade?next=${encodeURIComponent(nextPath)}`

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
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#D4AF37] p-8">
        <div className="space-y-2 text-center">
          <Shield className="mx-auto text-[#D4AF37]" size={36} />
          <h1 className="text-2xl font-bold text-[#D4AF37]">Aceite dos Termos</h1>
          <p className="text-sm text-gray-300">
            Ao continuar, você concorda com nossos Termos de Uso e Política de
            Privacidade.
          </p>
        </div>

        {error && (
          <div
            className="rounded border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <fieldset className="space-y-4" aria-describedby="termos-descricao">
          <legend id="termos-descricao" className="text-sm text-gray-300">
            Selecione as opções para confirmar sua ciência legal.
          </legend>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="flex items-start gap-3">
              <input
                id="aceite-termos"
                type="checkbox"
                checked={termos}
                onChange={(e) => setTermos(e.target.checked)}
                className="mt-1 h-5 w-5 cursor-pointer rounded border-gray-500 accent-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                aria-label="Li e aceito os Termos de Uso"
              />
              <label htmlFor="aceite-termos" className="cursor-pointer text-sm leading-6 text-gray-200">
                Li e aceito os termos legais para continuar.
              </label>
            </div>
            <div className="mt-2 pl-8">
              <Link
                href={termsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center underline decoration-[#D4AF37] underline-offset-4 transition hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                aria-label="Abrir Termo de Uso em nova aba"
              >
                Termo de Uso
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="flex items-start gap-3">
              <input
                id="aceite-privacidade"
                type="checkbox"
                checked={privacidade}
                onChange={(e) => setPrivacidade(e.target.checked)}
                className="mt-1 h-5 w-5 cursor-pointer rounded border-gray-500 accent-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                aria-label="Li e aceito a Política de Privacidade"
              />
              <label
                htmlFor="aceite-privacidade"
                className="cursor-pointer text-sm leading-6 text-gray-200"
              >
                Li e aceito as regras de privacidade e tratamento de dados.
              </label>
            </div>
            <div className="mt-2 pl-8">
              <Link
                href={privacyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center underline decoration-[#D4AF37] underline-offset-4 transition hover:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                aria-label="Abrir Política de Privacidade em nova aba"
              >
                Política de Privacidade
              </Link>
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="min-h-11 border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
            <Link href={termsHref} target="_blank" rel="noopener noreferrer" aria-label="Ver Termos de Uso em nova aba">
              Ver Termos
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
            <Link href={privacyHref} target="_blank" rel="noopener noreferrer" aria-label="Ver Política de Privacidade em nova aba">
              Ver Política
            </Link>
          </Button>
        </div>

        <Button
          onClick={handleContinue}
          className="min-h-11 w-full bg-[#D4AF37] text-black hover:bg-[#c9a634]"
        >
          Aceitar e continuar
        </Button>
      </div>
    </div>
  )
}
