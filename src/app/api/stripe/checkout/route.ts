import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import {
  CreditPackId,
  SubscriptionPlanId,
  creditPackEnvById,
  creditPackAmounts,
  getSiteUrl,
  subscriptionPriceEnvByPlan,
} from '@/lib/billing'
import { getStripeClient } from '@/lib/stripe'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

type CheckoutRequest =
  | { mode: 'subscription'; planId: string }
  | { mode: 'payment'; creditPackId: CreditPackId }

/**
 * 🔁 Normaliza IDs amigáveis (frontend) → IDs internos (billing)
 */
function normalizePlanId(planId: string): SubscriptionPlanId | null {
  const map: Record<string, SubscriptionPlanId> = {
    premium_mensal: 'premium_monthly',
    premium_anual: 'premium_yearly',
    premium_plus: 'premium_plus',

    // defensivo
    premium_monthly: 'premium_monthly',
    premium_yearly: 'premium_yearly',
  }

  return map[planId] ?? null
}

function getPriceId(mode: CheckoutRequest['mode'], id: string) {
  if (mode === 'subscription') {
    const normalized = normalizePlanId(id)
    if (!normalized) return null

    return process.env[
      subscriptionPriceEnvByPlan[normalized] as string
    ]
  }

  return process.env[
    creditPackEnvById[id as CreditPackId] as string
  ]
}

export async function POST(req: Request) {
  try {
    getSupabasePublicEnv('api/stripe/checkout')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  let body: CheckoutRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const priceId = getPriceId(
    body.mode,
    body.mode === 'subscription'
      ? body.planId
      : body.creditPackId
  )

  if (!priceId) {
    console.error('Preço não encontrado para payload:', body)
    return NextResponse.json(
      { error: 'Plano não configurado no Stripe' },
      { status: 500 }
    )
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl()

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: body.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: `${siteUrl}/planos?status=success`,
      cancel_url: `${siteUrl}/planos?status=cancel`,
      metadata:
        body.mode === 'subscription'
          ? {
              user_id: user.id,
              plan: body.planId,
            }
          : {
              user_id: user.id,
              credits: String(creditPackAmounts[body.creditPackId]),
            },
      subscription_data:
        body.mode === 'subscription'
          ? {
              metadata: {
                user_id: user.id,
                plan: body.planId,
              },
            }
          : undefined,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Erro Stripe:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
