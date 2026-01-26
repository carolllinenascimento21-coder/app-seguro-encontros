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
 * 🔁 Mapeamento frontend (pt-BR) → backend (padrão do sistema)
 * ⚠️ NÃO altera banco, NÃO altera webhook
 */
const PLAN_ID_MAP: Record<string, SubscriptionPlanId> = {
  premium_mensal: 'premium_monthly',
  premium_anual: 'premium_yearly',
  premium_plus: 'premium_plus',
}

function getPriceId(mode: CheckoutRequest['mode'], id: string) {
  if (mode === 'subscription') {
    return process.env[
      subscriptionPriceEnvByPlan[id as SubscriptionPlanId] as string
    ]
  }

  return process.env[creditPackEnvById[id as CreditPackId] as string]
}

export async function POST(req: Request) {
  /* ────────────────────────────────────────────────
     1️⃣ Validação de ambiente Supabase
     ──────────────────────────────────────────────── */
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/stripe/checkout')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  /* ────────────────────────────────────────────────
     2️⃣ Autenticação
     ──────────────────────────────────────────────── */
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    )
  }

  /* ────────────────────────────────────────────────
     3️⃣ Payload
     ──────────────────────────────────────────────── */
  let body: CheckoutRequest
  try {
    body = await req.json()
  } catch (error) {
    console.error('Erro ao ler payload do checkout', error)
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (
    (body.mode === 'subscription' && !(body as any).planId) ||
    (body.mode === 'payment' && !(body as any).creditPackId)
  ) {
    return NextResponse.json(
      { error: 'Dados incompletos para checkout' },
      { status: 400 }
    )
  }

  /* ────────────────────────────────────────────────
     4️⃣ Resolver ID real do plano
     ──────────────────────────────────────────────── */
  const resolvedId =
    body.mode === 'subscription'
      ? PLAN_ID_MAP[(body as any).planId]
      : (body as any).creditPackId

  if (!resolvedId) {
    console.error('Plano inválido recebido:', body)
    return NextResponse.json(
      { error: 'Plano inválido' },
      { status: 400 }
    )
  }

  const priceId = getPriceId(body.mode, resolvedId)

  if (!priceId) {
    console.error('Preço não configurado para:', resolvedId)
    return NextResponse.json(
      { error: 'Configuração de preços ausente' },
      { status: 500 }
    )
  }

  /* ────────────────────────────────────────────────
     5️⃣ Stripe Checkout
     ──────────────────────────────────────────────── */
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl()
  const successUrl = `${siteUrl}/planos?status=success`
  const cancelUrl = `${siteUrl}/planos?status=cancel`

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
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
              plan: resolvedId,
            }
          : {
              user_id: user.id,
              credits: String(
                creditPackAmounts[(body as any).creditPackId]
              ),
            },
      subscription_data:
        body.mode === 'subscription'
          ? {
              metadata: {
                user_id: user.id,
                plan: resolvedId,
              },
            }
          : undefined,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Erro ao criar sessão Stripe', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
