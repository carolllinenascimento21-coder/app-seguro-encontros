'use client'

import { Eye, Lock, Check, X, Shield, Zap, Crown, Star, AlertTriangle, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CHECKOUT_IDS = {
  credits3: 'credits_3',
  credits10: 'credits_10',
  credits25: 'credits_25',
} as const

export default function PlanosPage() {
  const router = useRouter()

  const scrollToPlans = () => {
    const plansSection = document.getElementById('planos-section')
    plansSection?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCheckout = async (plan: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      })

      if (res.status === 401) {
        window.location.href = `/login?redirect=/planos`
        return
      }

      if (!res.ok) {
        console.error('Stripe checkout failed', res.status)
        return
      }

      const data = await res.json()

      if (data?.url) {
        window.location.href = data.url
      } else {
        console.error('Stripe URL missing')
      }
    } catch (error) {
      console.error('Stripe checkout error', error)
    }
  }

  const startStripeCreditsCheckout = async (checkoutId: string) => {
    try {
      const response = await fetch('/api/stripe/credits-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packId: checkoutId }),
      })

      if (!response.ok) return

      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url
      }
    } catch {
      return
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Eye className="w-10 h-10 text-[#D4AF37]" />
              <Lock className="w-5 h-5 text-[#C0C0C0] absolute -bottom-1 -right-1" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] bg-clip-text text-transparent mb-2">
            Confia+
          </h1>

          <p className="text-[#C0C0C0] text-lg">
            Segurança e Proteção Feminina
          </p>
        </div>

        {/* Paywall */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-[#0a0a0a] border-2 border-[#D4AF37] rounded-2xl p-8">

            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-[#FFD700]" />
              <h2 className="text-2xl font-bold text-[#FFD700]">Atenção</h2>
            </div>

            <p className="text-xl text-white mb-3 font-semibold">
              ⚠️ Este homem possui alertas importantes.
            </p>

            <p className="text-lg text-[#C0C0C0] mb-2">
              Desbloqueie para ver detalhes completos.
            </p>

            <p className="text-lg text-[#D4AF37] font-medium mb-6">
              Proteja suas escolhas. Tome decisões inteligentes.
            </p>

            <button
              onClick={scrollToPlans}
              className="w-full bg-[#FFD700] text-black font-bold py-4 rounded-xl"
            >
              Ver Planos
            </button>

          </div>
        </div>

        {/* PLANOS */}
        <div id="planos-section" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">

          {/* PREMIUM MENSAL */}
          <div className="border border-[#D4AF37] rounded-2xl p-6">
            <h3 className="text-xl font-bold text-[#D4AF37] mb-4">
              Premium Mensal
            </h3>

            <p className="text-4xl font-bold text-white mb-6">
              R$ 9,90
            </p>

            <button
              onClick={() => handleCheckout('premium_monthly')}
              className="w-full bg-[#FFD700] text-black font-bold py-3 rounded-xl"
            >
              Ativar Premium Mensal
            </button>
          </div>

          {/* PREMIUM ANUAL */}
          <div className="border-4 border-[#FFD700] rounded-2xl p-6">

            <h3 className="text-xl font-bold text-[#FFD700] mb-4">
              Premium Anual
            </h3>

            <p className="text-4xl font-bold text-white mb-6">
              R$ 79,90
            </p>

            <button
              onClick={() => handleCheckout('premium_yearly')}
              className="w-full bg-[#FFD700] text-black font-bold py-4 rounded-xl"
            >
              Assinar Anual
            </button>

          </div>

          {/* PREMIUM PLUS */}
          <div className="border border-[#C0C0C0] rounded-2xl p-6">

            <h3 className="text-xl font-bold text-[#C0C0C0] mb-4">
              Premium Plus
            </h3>

            <p className="text-4xl font-bold text-white mb-6">
              R$ 19,90
            </p>

            <button
              onClick={() => handleCheckout('premium_plus')}
              className="w-full bg-[#C0C0C0] text-black font-bold py-3 rounded-xl"
            >
              Ativar Premium Plus
            </button>

          </div>

          {/* CRÉDITOS */}
          <div className="border border-[#D4AF37] rounded-2xl p-6">

            <h3 className="text-xl font-bold text-[#FFD700] mb-6">
              Créditos Avulsos
            </h3>

            <button
              onClick={() => startStripeCreditsCheckout(CHECKOUT_IDS.credits3)}
              className="w-full mb-2 border border-[#D4AF37] py-3 rounded-lg"
            >
              3 créditos — R$ 6,90
            </button>

            <button
              onClick={() => startStripeCreditsCheckout(CHECKOUT_IDS.credits10)}
              className="w-full mb-2 border border-[#D4AF37] py-3 rounded-lg"
            >
              10 créditos — R$ 14,90
            </button>

            <button
              onClick={() => startStripeCreditsCheckout(CHECKOUT_IDS.credits25)}
              className="w-full border border-[#D4AF37] py-3 rounded-lg"
            >
              25 créditos — R$ 27,90
            </button>

          </div>

        </div>

        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-[#C0C0C0] underline"
          >
            Voltar
          </button>
        </div>

      </div>
    </div>
  )
}
