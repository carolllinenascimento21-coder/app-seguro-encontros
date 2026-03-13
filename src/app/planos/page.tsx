'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type PlanId = 'premium_monthly' | 'premium_yearly' | 'premium_plus'

type Plan = {
  id: PlanId
  title: string
  price: string
  period: string
  subtitle: string
  features: string[]
  highlight?: boolean
  badge?: string
}

const plans: Plan[] = [
  {
    id: 'premium_monthly',
    title: 'Premium Mensal',
    price: 'R$ 9,90',
    period: '/mês',
    subtitle: 'Ideal para quem quer clareza imediata.',
    features: [
      'Consultas ilimitadas',
      'Acesso às avaliações completas',
      'Histórico comportamental',
      'Alertas relevantes',
    ],
  },
  {
    id: 'premium_yearly',
    title: 'Premium Anual',
    price: 'R$ 79,90',
    period: '/ano',
    subtitle: 'Proteção total com melhor custo-benefício.',
    features: [
      'Tudo do Premium Mensal',
      'Economia anual significativa',
      'Acesso prioritário a novos alertas',
      'Histórico completo e aprofundado',
    ],
    highlight: true,
    badge: 'Mais escolhido',
  },
  {
    id: 'premium_plus',
    title: 'Premium Plus',
    price: 'R$ 19,90',
    period: '/mês',
    subtitle: 'Para quem exige o nível máximo de proteção.',
    features: [
      'Tudo do Premium Anual',
      'Alertas em tempo real',
      'Análise de padrões emocionais',
      'Detecção de comportamentos reincidentes',
      'Desbloqueio automático de alertas críticos',
    ],
  },
]

export default function PlanosPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)

  const handleCheckout = async (planId: PlanId) => {
    try {
      setLoadingPlan(planId)

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
    } catch (error: any) {
      console.error('Erro ao iniciar checkout:', error)
      alert(error?.message || 'Erro ao iniciar pagamento')
    } finally {
      setLoadingPlan(null)
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
              <p className="mt-2 text-gray-300">{plan.subtitle}</p>

              <div className="mt-5">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="ml-1 text-gray-400">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-gray-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#D4AF37]">✔</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
                className="mt-8 w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === plan.id ? 'Redirecionando...' : 'Assinar Plano'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-[#D4AF37]/30">
          <div className="grid grid-cols-4 bg-[#151515] text-sm font-bold text-white">
            <div className="p-4">Recursos</div>
            <div className="p-4 text-center">Gratuito</div>
            <div className="p-4 text-center">Premium</div>
            <div className="p-4 text-center">Premium Plus</div>
          </div>

          {[
            ['Consultas', 'Limitadas', 'Ilimitadas', 'Ilimitadas'],
            ['Avaliações completas', '❌', '✔', '✔'],
            ['Histórico comportamental', '❌', '✔', '✔'],
            ['Alertas relevantes', '❌', '✔', '✔'],
            ['Alertas em tempo real', '❌', '❌', '✔'],
            ['Análise de padrões', '❌', '❌', '✔'],
            ['Comportamentos reincidentes', '❌', '❌', '✔'],
          ].map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-4 border-t border-[#D4AF37]/20 bg-black text-sm text-gray-200"
            >
              <div className="p-4 font-medium text-white">{row[0]}</div>
              <div className="p-4 text-center">{row[1]}</div>
              <div className="p-4 text-center">{row[2]}</div>
              <div className="p-4 text-center">{row[3]}</div>
            </div>
          ))}
        </div>

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
