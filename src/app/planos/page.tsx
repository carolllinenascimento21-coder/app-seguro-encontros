'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Lock, Zap, Crown, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SubscriptionPlanId =
  | 'premium_monthly'
  | 'premium_yearly'
  | 'premium_plus'

type FrontPlanId = SubscriptionPlanId

type PlanRecord = {
  id: string
  price?: number | null
  priceFormatted?: string | null
  currency?: string | null
  lookupKeys?: string[]
}

const formatPrice = (
  price?: number | null,
  formatted?: string | null,
  currency?: string | null
) => {
  if (formatted) return formatted
  if (!price) return null

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
    minimumFractionDigits: 2,
  }).format(price)
}

export default function PlanosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<FrontPlanId | null>(null)
  const [plans, setPlans] = useState<PlanRecord[]>([])

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => setPlans(data?.plans ?? []))
      .catch(() => setPlans([]))
  }, [])

  const resolvePlan = useMemo(
    () => (id: string) =>
      plans.find(p => p.id === id || p.lookupKeys?.includes(id)),
    [plans]
  )

  const premiumMonthly = resolvePlan('premium_monthly')
  const premiumYearly = resolvePlan('premium_yearly')
  const premiumPlus = resolvePlan('premium_plus')

  const goToCheckout = (planId: SubscriptionPlanId) => {
    setLoading(planId)
    router.push(`/checkout?mode=subscription&planId=${planId}`)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Eye className="w-10 h-10 text-[#D4AF37]" />
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <h1 className="text-4xl font-bold text-[#D4AF37]">Confia+</h1>
          <p className="text-gray-400 mt-2">
            Segurança, informação e proteção feminina
          </p>
        </div>

        {/* Planos */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">

          {/* Premium Mensal */}
          <div className="border border-[#D4AF37]/30 rounded-2xl p-6">
            <Zap className="w-6 h-6 text-[#D4AF37] mb-3" />
            <h3 className="text-xl font-bold text-[#D4AF37] mb-2">
              Premium Mensal
            </h3>

            <p className="text-3xl font-bold mb-4">
              {formatPrice(
                premiumMonthly?.price,
                premiumMonthly?.priceFormatted,
                premiumMonthly?.currency
              ) ?? 'R$ 9,90'}
              <span className="text-sm text-gray-400"> /mês</span>
            </p>

            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>✔ Pesquisas ilimitadas</li>
              <li>✔ Acesso às avaliações completas</li>
              <li>✔ Alertas detalhados</li>
              <li>✔ Histórico comportamental</li>
              <li>✔ Red flags reveladas</li>
            </ul>

            <button
              onClick={() => goToCheckout('premium_monthly')}
              disabled={loading === 'premium_monthly'}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading === 'premium_monthly' ? 'Processando...' : 'Assinar Mensal'}
            </button>
          </div>

          {/* Premium Anual */}
          <div className="border-4 border-[#FFD700] rounded-2xl p-6 scale-105">
            <Crown className="w-7 h-7 text-[#FFD700] mb-3" />
            <span className="inline-block mb-2 text-xs bg-[#FFD700] text-black px-3 py-1 rounded-full font-bold">
              MAIS ESCOLHIDO
            </span>

            <h3 className="text-xl font-bold text-[#FFD700] mb-2">
              Premium Anual
            </h3>

            <p className="text-3xl font-bold mb-1">
              {formatPrice(
                premiumYearly?.price,
                premiumYearly?.priceFormatted,
                premiumYearly?.currency
              ) ?? 'R$ 79,90'}
              <span className="text-sm text-gray-400"> /ano</span>
            </p>

            <p className="text-sm text-[#FFD700] mb-4">
              Equivalente a R$ 6,60/mês • Economia de 33%
            </p>

            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>✔ Tudo do plano mensal</li>
              <li>✔ Avisos antecipados</li>
              <li>✔ Prioridade de segurança</li>
              <li>✔ Histórico completo</li>
              <li>✔ Red flags e padrões emocionais</li>
            </ul>

            <button
              onClick={() => goToCheckout('premium_yearly')}
              disabled={loading === 'premium_yearly'}
              className="w-full bg-[#FFD700] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading === 'premium_yearly' ? 'Processando...' : 'Assinar Anual'}
            </button>
          </div>

          {/* Premium Plus */}
          <div className="border border-gray-500 rounded-2xl p-6">
            <Shield className="w-6 h-6 text-gray-300 mb-3" />
            <h3 className="text-xl font-bold text-gray-200 mb-2">
              Premium Plus
            </h3>

            <p className="text-3xl font-bold mb-4">
              {formatPrice(
                premiumPlus?.price,
                premiumPlus?.priceFormatted,
                premiumPlus?.currency
              ) ?? 'R$ 19,90'}
              <span className="text-sm text-gray-400"> /mês</span>
            </p>

            <ul className="space-y-2 text-sm text-gray-300 mb-6">
              <li>✔ Tudo do Premium Anual</li>
              <li>✔ Análise de padrões emocionais</li>
              <li>✔ Mapa de risco comportamental</li>
              <li>✔ Alertas automáticos em tempo real</li>
            </ul>

            <button
              onClick={() => goToCheckout('premium_plus')}
              disabled={loading === 'premium_plus'}
              className="w-full bg-gray-300 text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading === 'premium_plus' ? 'Processando...' : 'Assinar Plus'}
            </button>
          </div>
        </div>

        {/* Voltar */}
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-400 underline hover:text-[#D4AF37]"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
