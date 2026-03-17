'use client'

import { Crown, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type PremiumTeaserCardProps = {
  title?: string
  subtitle?: string
  ctaLabel?: string
}

export function PremiumTeaserCard({
  title = 'Existem informações importantes sobre esta busca',
  subtitle = 'Há dados disponíveis para este perfil. Desbloqueie reputação, alertas e relatos.',
  ctaLabel = 'Desbloquear com Premium',
}: PremiumTeaserCardProps) {
  const router = useRouter()

  return (
    <div className="rounded-2xl border border-[#D4AF37]/60 bg-gradient-to-br from-[#1A1510] via-black to-[#151515] p-5 shadow-[0_0_24px_rgba(212,175,55,0.18)]">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F5D77A]">
        <Crown className="h-3.5 w-3.5" />
        Gold Safety Access
      </div>

      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-[#E7D7AA]">{subtitle}</p>

      <button
        type="button"
        onClick={() => router.push('/planos')}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#FFD86B] py-3 text-sm font-bold text-black transition hover:opacity-90"
      >
        <Lock className="h-4 w-4" />
        {ctaLabel}
      </button>
    </div>
  )
}
