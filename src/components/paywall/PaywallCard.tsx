'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type PaywallCardProps = {
  hasData: boolean
}

export function PaywallCard({ hasData }: PaywallCardProps) {
  const router = useRouter()

  return (
    <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-zinc-800 p-2 text-yellow-400">
          <Lock size={18} />
        </div>

        <div className="flex-1">
          <p className="text-lg font-semibold text-white">
            Existem informações importantes sobre essa pessoa
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            Já encontramos avaliações, relatos e alertas relevantes sobre este perfil.
          </p>

          <p className="mt-2 text-xs text-zinc-400">
            Para proteger a privacidade e segurança da comunidade, o acesso completo é exclusivo para usuárias com plano ativo.
          </p>

          {hasData && (
            <ul className="mt-4 space-y-1 text-xs text-yellow-200">
              <li>• Usuárias estão consultando este perfil agora</li>
              <li>• Novas avaliações recentes disponíveis</li>
              <li>• Pode conter alertas importantes</li>
            </ul>
          )}

          <button
            type="button"
            onClick={() => router.push('/planos')}
            className="mt-5 w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-bold text-black transition hover:opacity-90"
          >
            Ver informações completas
          </button>
        </div>
      </div>
    </div>
  )
}
