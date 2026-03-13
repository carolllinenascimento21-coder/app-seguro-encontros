'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type PlanId =
  | 'premium_monthly'
  | 'premium_yearly'
  | 'premium_plus'

const plans = [
  {
    id: 'premium_monthly' as PlanId,
    name: 'Premium Mensal',
    price: 'R$ 9,90',
    period: '/mês',
    features: [
      'Consultas ilimitadas',
      'Acesso às avaliações completas',
      'Histórico comportamental',
      'Alertas relevantes'
    ]
  },
  {
    id: 'premium_yearly' as PlanId,
    name: 'Premium Anual',
    price: 'R$ 79,90',
    period: '/ano',
    highlight: true,
    features: [
      'Tudo do Premium Mensal',
      'Economia anual significativa',
      'Acesso prioritário a novos alertas',
      'Histórico completo'
    ]
  },
  {
    id: 'premium_plus' as PlanId,
    name: 'Premium Plus',
    price: 'R$ 19,90',
    period: '/mês',
    features: [
      'Tudo do Premium',
      'Alertas em tempo real',
      'Análise de padrões emocionais',
      'Detecção de comportamentos reincidentes'
    ]
  }
]

export default function PlanosPage() {

  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const checkout = async (planId: PlanId) => {

    try {

      setLoading(planId)

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId
        })
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()

      if (!data?.url) {
        throw new Error('Checkout não retornou URL')
      }

      window.location.href = data.url

    } catch (err) {

      console.error(err)
      alert('Erro ao iniciar pagamento')

    } finally {

      setLoading(null)

    }
  }

  return (

    <div className="min-h-screen bg-black text-white px-4 py-12">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold text-center text-[#D4AF37] mb-8">
          Conheça os Planos Confia+
        </h1>

        <div className="grid md:grid-cols-3 gap-6">

          {plans.map(plan => (

            <div
              key={plan.id}
              className={`border rounded-xl p-6 bg-[#111]
              ${plan.highlight
                ? 'border-[#D4AF37]'
                : 'border-gray-800'}
              `}
            >

              {plan.highlight && (
                <div className="text-xs text-[#D4AF37] mb-2 font-bold">
                  MAIS ESCOLHIDO
                </div>
              )}

              <h2 className="text-xl font-semibold mb-2">
                {plan.name}
              </h2>

              <div className="text-3xl font-bold mb-4">
                {plan.price}
                <span className="text-sm text-gray-400 ml-1">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-2 text-sm text-gray-300 mb-6">
                {plan.features.map(f => (
                  <li key={f}>✔ {f}</li>
                ))}
              </ul>

              <button
                onClick={() => checkout(plan.id)}
                disabled={loading === plan.id}
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
              >
                {loading === plan.id
                  ? 'Redirecionando...'
                  : 'Assinar Plano'}
              </button>

            </div>

          ))}

        </div>

      </div>

    </div>

  )
}
