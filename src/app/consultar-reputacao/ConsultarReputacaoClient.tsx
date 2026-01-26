'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { canAccessFeature, type ProfileAccess } from '@/lib/permissions'
import { Crown, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  profile: ProfileAccess
}

export default function ConsultarReputacaoClient({ profile }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)

  const permissions = useMemo(() => {
    return {
      canViewFull: canAccessFeature(profile, 'VIEW_RESULT_FULL'),
      canAdvanced: canAccessFeature(profile, 'ADVANCED_ANALYSIS'),
    }
  }, [profile])

  const handleSearch = () => {
    setSearched(true)
    // aqui você chamaria sua API / lógica de busca real
  }

  const goPlans = () => {
    // você pode incluir query params para tracking
    router.push('/planos?from=consultar-reputacao')
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Consultar reputação
          </h1>

          <button
            onClick={goPlans}
            className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-2 px-4 rounded-full"
          >
            <Crown className="w-4 h-4" />
            Ver Planos
          </button>
        </div>

        {/* Busca */}
        <div className="border border-[#D4AF37] rounded-2xl p-4 space-y-3">
          <p className="text-sm text-[#EFD9A7]">
            Digite o nome para consultar. Você verá um resumo gratuito; detalhes completos exigem plano.
          </p>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full rounded-xl border border-[#D4AF37] bg-transparent px-3 py-3 text-[#EFD9A7] placeholder:text-gray-500"
          />

          <Button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="w-full bg-[#D4AF37] text-black font-bold py-6 rounded-2xl disabled:opacity-60"
          >
            Consultar
          </Button>
        </div>

        {/* Resultado */}
        {searched && (
          <div className="space-y-4">
            {/* Resumo (sempre liberado) */}
            <div className="border border-[#D4AF37] rounded-2xl p-5">
              <h2 className="text-lg font-semibold">Resumo</h2>
              <p className="text-sm text-[#EFD9A7] mt-2">
                Encontramos registros relacionados. Há sinais que merecem atenção.
              </p>
            </div>

            {/* Detalhes (bloqueado no free) */}
            {!permissions.canViewFull ? (
              <PaywallBlock
                title="Detalhes completos protegidos"
                subtitle="Para evitar abusos, comentários e históricos completos são visíveis apenas para usuárias verificadas."
                onCta={goPlans}
                ctaText="Ativar acesso seguro"
              />
            ) : (
              <div className="border border-[#D4AF37] rounded-2xl p-5">
                <h2 className="text-lg font-semibold">Detalhes completos</h2>
                <ul className="mt-3 space-y-2 text-sm text-[#EFD9A7] list-disc pl-5">
                  <li>Histórico de relatos e datas</li>
                  <li>Comentários completos (com moderação)</li>
                  <li>Padrões recorrentes reportados</li>
                </ul>
              </div>
            )}

            {/* Análise avançada (somente Plus) */}
            {!permissions.canAdvanced ? (
              <PaywallBlock
                title="Análise avançada (Premium Plus)"
                subtitle="Recursos de prevenção ativa: mapa de risco e sinais de manipulação recorrente."
                onCta={goPlans}
                ctaText="Ativar Premium Plus"
                variant="plus"
              />
            ) : (
              <div className="border border-[#D4AF37] rounded-2xl p-5">
                <h2 className="text-lg font-semibold">Análise avançada</h2>
                <p className="text-sm text-[#EFD9A7] mt-2">
                  Padrões identificados: risco médio. Recomenda-se cautela e validação adicional.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================
   Paywall UX Component
========================= */
function PaywallBlock({
  title,
  subtitle,
  onCta,
  ctaText,
  variant = 'default',
}: {
  title: string
  subtitle: string
  onCta: () => void
  ctaText: string
  variant?: 'default' | 'plus'
}) {
  return (
    <div className="border border-[#D4AF37] rounded-2xl p-5 bg-black/40">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Lock className="w-5 h-5 text-[#D4AF37]" />
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold">
            {title}
          </h3>
          <p className="text-sm text-[#EFD9A7] mt-1">
            {subtitle}
          </p>

          <div className="mt-4">
            <button
              onClick={onCta}
              className={`w-full font-bold py-3 rounded-xl ${
                variant === 'plus'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black'
                  : 'bg-[#D4AF37] text-black'
              }`}
            >
              {ctaText}
            </button>

            <p className="text-xs text-gray-400 mt-2">
              Pagamento seguro • Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
