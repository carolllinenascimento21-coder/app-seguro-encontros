'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Plan = {
  name: string
  priceId: string
  price: string
  description: string
}

const plans: Plan[] = [
  {
    name: 'Premium Mensal',
    priceId: 'price_premium_monthly',
    price: 'R$ 29,90',
    description: 'Consultas ilimitadas e acesso completo às avaliações',
  },
  {
    name: 'Premium Anual',
    priceId: 'price_premium_yearly',
    price: 'R$ 197,00',
    description: 'Melhor custo-benefício com acesso total durante 1 ano',
  },
  {
    name: 'Premium Plus',
    priceId: 'price_premium_plus',
    price: 'R$ 39,90',
    description: 'Alertas em tempo real e análise avançada de padrões',
  },
]

export default function PlanosPage() {

  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const startCheckout = async (priceId: string) => {
    try {

      setLoading(priceId)

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()

      if (!data.url) {
        throw new Error('Erro ao criar sessão de pagamento')
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
    <div className="min-h-screen bg-black text-white px-4 py-10">

      <div className="max-w-3xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold text-[#D4AF37] text-center">
          Conheça os Planos Confia+
        </h1>

        <p className="text-center text-gray-400">
          Segurança e clareza para decisões conscientes
        </p>

        <div className="grid gap-6">

          {plans.map((plan) => (

            <div
              key={plan.priceId}
              className="border border-[#D4AF37] rounded-xl p-6 bg-black/40"
            >

              <h2 className="text-xl font-semibold text-[#D4AF37]">
                {plan.name}
              </h2>

              <p className="text-gray-400 mt-2">
                {plan.description}
              </p>

              <p className="text-2xl font-bold mt-4">
                {plan.price}
              </p>

              <button
                onClick={() => startCheckout(plan.priceId)}
                disabled={loading === plan.priceId}
                className="mt-4 w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
              >
                {loading === plan.priceId
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
