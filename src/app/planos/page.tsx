'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { isMobileAppRuntime } from '@/lib/mobile-billing'
import {
  purchasePlan,
  restoreMobilePurchases,
  syncAppleEntitlementsWithBackend,
} from '@/lib/purchase-plan'

type FreePlanId = 'free'
type SubscriptionPlanId = 'premium_monthly' | 'premium_yearly'
type PlanId = FreePlanId | SubscriptionPlanId

type Plan = {
  id: PlanId
  title: string
  price: string
  period: string
  features: string[]
  canCheckout?: boolean
  highlight?: boolean
  badge?: string
}

const plans: Plan[] = [
  {
    id: 'free',
    title: 'Plano Free',
    price: 'R$ 0,00',
    period: '',
    features: [
      'Acesso limitado às consultas',
      'Visualização básica de avaliações',
      'Sem prioridade',
    ],
    canCheckout: false,
  },
  {
    id: 'premium_monthly',
    title: 'Premium Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    features: [
      'Consultas ilimitadas',
      'Acesso completo às avaliações',
      'Prioridade no sistema',
      'Recursos de segurança completos',
    ],
    canCheckout: true,
  },
  {
    id: 'premium_yearly',
    title: 'Premium Anual',
    price: 'R$ 99,90',
    period: '/ano',
    features: [
      'Consultas ilimitadas',
      'Acesso completo às avaliações',
      'Prioridade no sistema',
      'Recursos de segurança completos',
    ],
    highlight: true,
    badge: 'Mais escolhido',
    canCheckout: true,
  },
]

export default function PlanosPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [restoring, setRestoring] = useState(false)
  const isMobileApp = isMobileAppRuntime()

  useEffect(() => {
    let active = true
    const runEntitlementSync = async (force = false) => {
      try {
        return await syncAppleEntitlementsWithBackend({ force })
      } catch (error) {
        console.error('Falha ao sincronizar entitlements Apple:', error)
        return { ok: false, error }
      }
    }

    // Disponível também para testes via Web Inspector, mesmo antes do bridge estar pronto.
    window.__confiaSyncAppleEntitlements = async () => runEntitlementSync(true)

    if (!isMobileApp) {
      return () => {
        active = false
        delete window.__confiaSyncAppleEntitlements
      }
    }

    runEntitlementSync(false)
    const intervalId = window.setInterval(() => {
      if (!active) return
      void runEntitlementSync(false)
    }, 15000)

    return () => {
      active = false
      window.clearInterval(intervalId)
      delete window.__confiaSyncAppleEntitlements
    }
  }, [isMobileApp])

  const startStripeCheckout = async (planId: SubscriptionPlanId) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId }),
    })

    if (res.status === 401) {
      router.push('/login')
      return
    }

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Erro ao iniciar checkout')
    }

    if (!data?.url) {
      throw new Error('URL do Stripe não retornada')
    }

    window.location.href = data.url
  }

  const handleCheckout = async (planId: SubscriptionPlanId) => {
    try {
      setLoadingPlan(planId)
      const result = await purchasePlan(planId, startStripeCheckout)
      if (result?.ok) {
        alert('Assinatura ativada com sucesso. Redirecionando para seu perfil...')
        router.push('/perfil')
      }
    } catch (error: any) {
      console.error('Erro ao iniciar checkout:', error)
      alert(error?.message || 'Erro ao iniciar pagamento')
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true)
      const result = await restoreMobilePurchases()
      if (result?.ok) {
        alert('Compras restauradas com sucesso. Redirecionando para seu perfil...')
        router.push('/perfil')
        return
      }
    } catch (error: any) {
      console.error('Erro ao restaurar compras:', error)
      alert(error?.message || 'Erro ao restaurar compras')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-[#D4AF37]">Confia+</h1>
          <p className="mt-3 text-xl font-semibold">
            Segurança e clareza para decisões conscientes
          </p>
          <p className="mt-3 text-gray-300">
            Antes de se envolver, informe-se. O Confia+ é uma plataforma criada
            para mulheres que valorizam segurança emocional, transparência e proteção
            ao conhecer alguém.
          </p>
        </div>

        <div className="mb-12 rounded-2xl border border-[#D4AF37]/30 bg-[#111] p-6">
          <h2 className="mb-4 text-2xl font-bold text-[#D4AF37]">Como funciona?</h2>
          <div className="space-y-2 text-gray-200">
            <p>1. Você cria uma conta gratuita</p>
            <p>2. Consulta perfis e avaliações disponíveis</p>
            <p>3. Desbloqueia informações conforme seu plano</p>
            <p>4. Decide com mais segurança se vale a pena investir emocionalmente</p>
          </div>
        </div>

        <h2 className="mb-6 text-3xl font-bold text-[#D4AF37]">Conheça os Planos</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-[#D4AF37] bg-[#161616] shadow-[0_0_0_1px_rgba(212,175,55,0.15)]'
                  : 'border-[#D4AF37]/40 bg-[#111]'
              }`}
            >
              {plan.badge && (
                <div className="mb-4 inline-block rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold text-black">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-2xl font-bold text-[#D4AF37]">{plan.title}</h3>
              <div className="mt-5">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period ? <span className="ml-1 text-gray-400">{plan.period}</span> : null}
              </div>

              <ul className="mt-6 space-y-3 text-sm text-gray-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#D4AF37]">✔</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.canCheckout ? (
                <button
                  onClick={() => handleCheckout(plan.id as SubscriptionPlanId)}
                  disabled={loadingPlan === plan.id}
                  className="mt-8 w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingPlan === plan.id
                    ? isMobileApp
                      ? 'Processando compra...'
                      : 'Redirecionando...'
                    : 'Assinar Plano'}
                </button>
              ) : (
                <button
                  disabled
                  className="mt-8 w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-black opacity-70 cursor-not-allowed"
                >
                  Plano Atual
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-[#D4AF37]/30">
          <div className="grid grid-cols-3 bg-[#151515] text-sm font-bold text-white">
            <div className="p-4">Recursos</div>
            <div className="p-4 text-center">Free</div>
            <div className="p-4 text-center">Premium</div>
          </div>

          {[
            ['Consultas', 'Limitado', 'Ilimitado'],
            ['Ver avaliações completas', '❌', '✅'],
            ['Prioridade', '❌', '✅'],
            ['Segurança avançada', '❌', '✅'],
          ].map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-3 border-t border-[#D4AF37]/20 bg-black text-sm text-gray-200"
            >
              <div className="p-4 font-medium text-white">{row[0]}</div>
              <div className="p-4 text-center">{row[1]}</div>
              <div className="p-4 text-center">{row[2]}</div>
            </div>
          ))}
        </div>

        {isMobileApp ? (
          <div className="mt-10 text-center">
            <button
              onClick={handleRestorePurchases}
              disabled={restoring}
              className="rounded-xl border border-[#D4AF37] px-6 py-3 font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restoring ? 'Restaurando compras...' : 'Restaurar compras'}
            </button>
          </div>
        ) : null}

        <div className="mt-14 rounded-2xl border border-[#D4AF37]/30 bg-[#111] p-6">
          <h2 className="mb-4 text-2xl font-bold text-[#D4AF37]">Por que confiar no Confia+?</h2>
          <div className="space-y-2 text-gray-200">
            <p>🔒 Plataforma exclusiva para mulheres</p>
            <p>🕶️ Total anonimato para quem avalia</p>
            <p>📊 Dados agregados — sem exposição indevida</p>
            <p>🛡️ Foco em proteção, não em julgamentos</p>
          </div>
          <p className="mt-6 text-gray-300">
            O Confia+ não é um app de encontros. É uma ferramenta de segurança emocional.
          </p>
        </div>
      </div>
    </div>
  )
}
