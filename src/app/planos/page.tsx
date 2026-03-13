'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Plan = {
  name: string
  price: string
  priceId: string
  highlight?: boolean
}

const plans: Plan[] = [
  {
    name: 'Premium Mensal',
    price: 'R$ 29,90',
    priceId: 'price_premium_monthly'
  },
  {
    name: 'Premium Anual',
    price: 'R$ 197,00',
    priceId: 'price_premium_yearly',
    highlight: true
  },
  {
    name: 'Premium Plus',
    price: 'R$ 39,90',
    priceId: 'price_premium_plus'
  }
]

export default function PlanosPage() {

  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function startCheckout(priceId: string) {

    try {

      setLoading(priceId)

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()

      if (!data.url) {
        throw new Error('Erro no checkout')
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
    <div className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-bold text-[#D4AF37] text-center mb-3">
          Conheça os Planos Confia+
        </h1>

        <p className="text-center text-gray-400 mb-10">
          Segurança e clareza para decisões conscientes
        </p>

        {/* CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">

          {plans.map(plan => (

            <div
              key={plan.name}
              className={`border rounded-xl p-6 ${
                plan.highlight
                  ? 'border-[#D4AF37] bg-[#111]'
                  : 'border-gray-800 bg-[#111]'
              }`}
            >

              {plan.highlight && (
                <div className="text-xs text-center mb-2 text-[#D4AF37] font-semibold">
                  MAIS ESCOLHIDO
                </div>
              )}

              <h2 className="text-xl font-semibold mb-3">
                {plan.name}
              </h2>

              <p className="text-3xl font-bold mb-6">
                {plan.price}
              </p>

              <button
                onClick={() => startCheckout(plan.priceId)}
                disabled={loading === plan.priceId}
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
              >
                {loading === plan.priceId
                  ? 'Redirecionando...'
                  : 'Assinar Plano'}
              </button>

            </div>

          ))}

        </div>

        {/* TABELA COMPARATIVA */}
        <div className="border border-gray-800 rounded-xl overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-[#111]">
              <tr>
                <th className="text-left p-4">Recursos</th>
                <th className="p-4">Gratuito</th>
                <th className="p-4 text-[#D4AF37]">Premium</th>
                <th className="p-4 text-[#D4AF37]">Premium Plus</th>
              </tr>
            </thead>

            <tbody>

              <tr className="border-t border-gray-800">
                <td className="p-4">Consultas</td>
                <td className="text-center">3</td>
                <td className="text-center">∞</td>
                <td className="text-center">∞</td>
              </tr>

              <tr className="border-t border-gray-800">
                <td className="p-4">Avaliações completas</td>
                <td className="text-center">❌</td>
                <td className="text-center">✔</td>
                <td className="text-center">✔</td>
              </tr>

              <tr className="border-t border-gray-800">
                <td className="p-4">Alertas de risco</td>
                <td className="text-center">❌</td>
                <td className="text-center">✔</td>
                <td className="text-center">✔</td>
              </tr>

              <tr className="border-t border-gray-800">
                <td className="p-4">Histórico comportamental</td>
                <td className="text-center">❌</td>
                <td className="text-center">✔</td>
                <td className="text-center">✔</td>
              </tr>

              <tr className="border-t border-gray-800">
                <td className="p-4">Análise avançada</td>
                <td className="text-center">❌</td>
                <td className="text-center">❌</td>
                <td className="text-center">✔</td>
              </tr>

              <tr className="border-t border-gray-800">
                <td className="p-4">Alertas em tempo real</td>
                <td className="text-center">❌</td>
                <td className="text-center">❌</td>
                <td className="text-center">✔</td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}
