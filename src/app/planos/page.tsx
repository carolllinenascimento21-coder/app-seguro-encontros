'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * IDs amigáveis (frontend)
 * 👉 NÃO são IDs do banco
 * 👉 Webhook faz o mapeamento
 */
type SubscriptionFrontPlanId =
  | 'premium_mensal'
  | 'premium_anual'
  | 'premium_plus'

type CreditFrontPlanId =
  | 'credits_3'
  | 'credits_10'
  | 'credits_25'

type FrontPlanId = SubscriptionFrontPlanId | CreditFrontPlanId

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

  const normalized =
    Number.isInteger(price) && price >= 100 ? price / 100 : price

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
    minimumFractionDigits: 2,
  }).format(normalized)
}

export default function PlanosPage() {
  const router = useRouter()
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  /* ======================================================
     CARREGA PLANOS (Stripe → API)
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
    () => (key: string) =>
      plans.find(plan => {
        const keys = [plan.id, ...(plan.lookupKeys ?? [])].filter(Boolean)
        return keys.includes(key)
      }),
    [plans]
  )

  const premiumMensal = resolvePlan('premium_mensal')
  const premiumAnual = resolvePlan('premium_anual')
  const premiumPlus = resolvePlan('premium_plus')

  /* ======================================================
     CHECKOUT
     ====================================================== */
  const startCheckout = async (
    payload:
      | { mode: 'subscription'; planId: SubscriptionFrontPlanId }
      | { mode: 'payment'; creditPackId: CreditFrontPlanId },
    key: FrontPlanId
  ) => {
    setLoadingCheckout(key)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        alert('Não foi possível iniciar o checkout.')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao iniciar checkout.')
    } finally {
      setLoadingCheckout(null)
    }
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
                premiumMensal?.price,
                premiumMensal?.priceFormatted,
                premiumMensal?.currency
              ) ?? 'R$ 9,90'}
            </p>

            <button
              onClick={() =>
                startCheckout(
                  { mode: 'subscription', planId: 'premium_mensal' },
                  'premium_mensal'
                )
              }
              disabled={loadingCheckout === 'premium_mensal'}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loadingCheckout === 'premium_mensal'
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
                premiumAnual?.price,
                premiumAnual?.priceFormatted,
                premiumAnual?.currency
              ) ?? 'R$ 79,90'}
            </p>
            <p className="text-sm text-[#FFD700] mb-4">
              Melhor custo-benefício
            </p>

            <button
              onClick={() =>
                startCheckout(
                  { mode: 'subscription', planId: 'premium_anual' },
                  'premium_anual'
                )
              }
              disabled={loadingCheckout === 'premium_anual'}
              className="w-full bg-[#FFD700] text-black font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loadingCheckout === 'premium_anual'
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
