'use client'

import { ShieldAlert, Crown, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type PremiumDetailLockProps = {
  hasData: boolean
}

export function PremiumDetailLock({ hasData }: PremiumDetailLockProps) {
  const router = useRouter()

  return (
    <div className="mt-6 rounded-2xl border border-[#D4AF37]/60 bg-gradient-to-b from-[#17120B] to-black p-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F4D98C]">
        <Crown className="h-3.5 w-3.5" />
        Premium / Gold
      </div>

      <h2 className="mt-4 text-xl font-semibold text-white">Desbloqueie informações de segurança antes de sair com este perfil</h2>
      <p className="mt-2 text-sm text-[#E7D7AA]">Veja relatos, alertas e sinais importantes.</p>

      <div className="mt-4 rounded-xl border border-[#D4AF37]/35 bg-black/40 p-4 text-sm text-zinc-200">
        <div className="flex items-center gap-2 text-[#F4D98C]">
          <ShieldAlert className="h-4 w-4" />
          <span>Acesso Premium</span>
        </div>
        <p className="mt-2 text-xs text-zinc-300">
          {hasData
            ? 'Há dados registrados para este perfil e o conteúdo completo está protegido para usuárias premium.'
            : 'Quando houver dados registrados para este perfil, o conteúdo completo ficará disponível no acesso premium.'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/planos')}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#FFD86B] py-3 text-sm font-bold text-black transition hover:opacity-90"
      >
        <Lock className="h-4 w-4" />
        Ver planos e desbloquear
      </button>
    </div>
  )
}
