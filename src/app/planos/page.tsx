'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * IDs CANÔNICOS
 * 👉 Iguais ao banco, backend e Stripe
 */
type SubscriptionPlanId =
  | 'premium_monthly'
  | 'premium_yearly'
  | 'premium_plus'

type CreditPlanId =
  | 'credits_3'
  | 'credits_10'
  | 'credits_25'

type FrontPlanId = SubscriptionPlanId | CreditPlanId

type PlanRecord = {
  id: string
  name?: string | null
  description?: string | null
  price?: number | null
  priceFormatted?: string | null
  currency?: string | null
  interval?: string | null
  type?: string | null
  credits?: number | null
  lookupKeys?: string[]
}

const formatPrice = (
  price: number | null | undefined,
  formatted: string | null | undefined,
  currency: string | null | undefined
) => {
  if (formatted) return formatted
  if (price == null || Number.isNaN(price)) return null

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
    minimumFractionDigits: 2,
  }).format(price)
}

export default function PlanosPage() {
  const router = useRouter()
  const [loadingCheckout, setLoadingCheckout] = useState<FrontPlanId | null>(null)
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  /* ======================================================
     CARREGA PLANOS
     ====================================================== */
  useEffect(() => {
    let mounted = true

    const loadPlans = async () => {
      try {
        const res = await fetch('/api/plans')
        const payload = await res.json()
        if (mounted) setPlans(payload?.plans ?? [])
      } catch {
        if (mounted) setPlans([])
      } finally {
        if (mounted) setPlansLoading(false)
      }
    }

    loadPlans()
    return () => {
      mounted = false
    }
  }, [])

  const resolvePlan = useMemo(
    () => (id: string) =>
      plans.find(p => p.id === id || p.lookupKeys?.includes(id)),
    [plans]
  )

  const premiumMonthly = resolvePlan('premium_monthly')
  const premiumYearly = resolvePlan('premium_yearly')
  const premiumPlus = resolvePlan('premium_plus')

  /* ======================================================
     CHECKOUT
     ====================================================== */
  const startCheckout = (
    payload:
      | { mode: 'subscription'; planId: SubscriptionPlanId }
      | { mode: 'payment'; creditPackId: CreditPlanId },
    key: FrontPlanId
  ) => {
    setLoadingCheckout(key)

    const params = new URLSearchParams()
    if (payload.mode === 'subscription') {
      params.set('mode', payload.mode)
      params.set('planId', payload.planId)
    } else {
      params.set('mode', payload.mode)
      params.set('creditPackId', payload.creditPackId)
    }

    router.push(`/checkout?${params.toString()}`)
  }

  /* ======================================================
     UI
     ====================================================== */
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-3">
            <Eye className="w-10 h-10 text-[#D4AF37]" />
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <h1 className="text-4xl font-bold text-[#D4AF37]">Confia+</h1>
          <p className="text-gray-400">
            Proteção, informação e decisão consciente
          </p>
        </div>

        {/* Planos */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {/* Premium Mensal */}
          <div className="border border-[#D4AF37]/30 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-[#D4AF37] mb-2">
              Premium Mensal
            </h3>
            <p className="text-3xl font-bold mb-4">
              {formatPrice(
                premiumMonthly?.price,
                premiumMonthly?.priceFormatted,
                premiumMonthly?.currency
              ) ?? 'R$ 9,90'}
            </p>

            <button
              onClick={() =>
                startCheckout(
                  { mode: 'subscription', planId: 'premium_monthly' },
                  'premium_monthly'
                )
              }
              disabled={loadingCheckout === 'premium_monthly'}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loadingCheckout === 'premium_monthly'
                ? 'Processando...'
                : 'Assinar Mensal'}
            </button>
          </div>

          {/* Premium Anual */}
          <div className="border-4 border-[#FFD700] rounded-2xl p-6 scale-105">
            <h3 className="text-xl font-bold text-[#FFD700] mb-2">
              Premium Anual
            </h3>
            <p className="text-3xl font-bold mb-1">
              {formatPrice(
                premiumYearly?.price,
                premiumYearly?.priceFormatted,
                premiumYearly?.currency
              ) ?? 'R$ 79,90'}
            </p>
            <p className="text-sm text-[#FFD700] mb-4">
              Melhor custo-benefício
            </p>

            <button
              onClick={() =>
                startCheckout(
                  { mode: 'subscription', planId: 'premium_yearly' },
                  'premium_yearly'
                )
              }
              disabled={loadingCheckout === 'premium_yearly'}
              className="w-full bg-[#FFD700] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loadingCheckout === 'premium_yearly'
                ? 'Processando...'
                : 'Assinar Anual'}
            </button>
          </div>

          {/* Premium Plus */}
          <div className="border border-gray-500 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-300 mb-2">
              Premium Plus
            </h3>
            <p className="text-3xl font-bold mb-4">
              {formatPrice(
                premiumPlus?.price,
                premiumPlus?.priceFormatted,
                premiumPlus?.currency
              ) ?? 'R$ 19,90'}
            </p>

            <button
              onClick={() =>
                startCheckout(
                  { mode: 'subscription', planId: 'premium_plus' },
                  'premium_plus'
                )
              }
              disabled={loadingCheckout === 'premium_plus'}
              className="w-full bg-gray-300 text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loadingCheckout === 'premium_plus'
                ? 'Processando...'
                : 'Assinar Plus'}
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
