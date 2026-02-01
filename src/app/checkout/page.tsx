'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type CheckoutState = {
  status: 'idle' | 'loading' | 'error'
  message?: string | null
}

const SUBSCRIPTION_PLAN_IDS = new Set([
  'premium_monthly',
  'premium_yearly',
  'premium_plus',
])

const CREDIT_PACK_IDS = new Set(['credits_3', 'credits_10', 'credits_25'])

type CheckoutRequest =
  | { endpoint: '/api/stripe/checkout'; body: { mode: 'subscription'; planId: string } }
  | { endpoint: '/api/stripe/credits-checkout'; body: { packId: string } }

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<CheckoutState>({ status: 'idle' })

  const checkoutRequest = useMemo<CheckoutRequest | null>(() => {
    const mode = searchParams.get('mode')

    if (mode === 'payment') {
      const creditPackId = searchParams.get('creditPackId')
      if (creditPackId && CREDIT_PACK_IDS.has(creditPackId)) {
        return {
          endpoint: '/api/stripe/credits-checkout',
          body: { packId: creditPackId },
        }
      }
      return null
    }

    const planId = searchParams.get('planId')
    if (planId && SUBSCRIPTION_PLAN_IDS.has(planId)) {
      return {
        endpoint: '/api/stripe/checkout',
        body: { mode: 'subscription', planId },
      }
    }

    return null
  }, [searchParams])

  useEffect(() => {
    if (!checkoutRequest) {
      setState({
        status: 'error',
        message: 'Parâmetros de checkout inválidos.',
      })
      return
    }

    const runCheckout = async () => {
      setState({ status: 'loading' })

      try {
        const res = await fetch(checkoutRequest.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkoutRequest.body),
        })

        if (res.status === 401) {
          router.replace('/login')
          return
        }

        const data = await res.json()
        if (data?.url) {
          window.location.href = data.url
          return
        }

        setState({
          status: 'error',
          message: 'Não foi possível iniciar o checkout.',
        })
      } catch (error) {
        console.error('Erro ao iniciar checkout:', error)
        setState({
          status: 'error',
          message: 'Erro ao iniciar checkout.',
        })
      }
    }

    runCheckout()
  }, [checkoutRequest, router])

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-red-700/60 rounded-2xl p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-red-400">
            Falha no checkout
          </h1>
          <p className="text-sm text-gray-400">
            {state.message ?? 'Não foi possível iniciar o checkout.'}
          </p>
          <button
            type="button"
            onClick={() => router.replace('/planos')}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634]"
          >
            Voltar para planos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Redirecionando para o checkout...</p>
      </div>
    </div>
  )
}
