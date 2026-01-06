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
import { stripe } from '@/lib/stripe'

type CheckoutRequest =
  | { mode: 'subscription'; planId: SubscriptionPlanId }
  | { mode: 'payment'; creditPackId: CreditPackId }

function getPriceId(mode: CheckoutRequest['mode'], id: string) {
  if (mode === 'subscription') {
    return process.env[subscriptionPriceEnvByPlan[id as SubscriptionPlanId] as string]
  }
  return process.env[creditPackEnvById[id as CreditPackId] as string]
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Usuária não autenticada' }, { status: 401 })
  }

  let body: CheckoutRequest
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload do checkout', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (
    (body.mode === 'subscription' && !body.planId) ||
    (body.mode === 'payment' && !body.creditPackId)
  ) {
    return NextResponse.json({ error: 'Dados incompletos para checkout' }, { status: 400 })
  }

  const priceId = getPriceId(
    body.mode,
    body.mode === 'subscription' ? body.planId : body.creditPackId
  )

  if (!priceId) {
    console.error('Preço não configurado para', body)
    return NextResponse.json({ error: 'Configuração de preços ausente' }, { status: 500 })
  }

  const siteUrl = getSiteUrl()
  const successUrl = `${siteUrl}/planos?status=success`
  const cancelUrl = `${siteUrl}/planos?status=cancel`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: body.mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
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

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Erro ao criar sessão do Stripe', error)
    return NextResponse.json({ error: 'Erro ao iniciar checkout' }, { status: 500 })
  }
}
