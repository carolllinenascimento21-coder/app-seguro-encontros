import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'

const PLAN_PRICE_ENV_CANDIDATES = {
  premium_monthly: ['STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_PREMIUM_MONTHLY', 'STRIPE_PRICE_PREMIUM_MENSAL'],
  premium_yearly: ['STRIPE_PRICE_YEARLY', 'STRIPE_PRICE_PREMIUM_YEARLY', 'STRIPE_PRICE_PREMIUM_ANUAL'],
  premium_plus: ['STRIPE_PRICE_PLUS', 'STRIPE_PRICE_PREMIUM_PLUS'],
} as const

type PlanId = keyof typeof PLAN_PRICE_ENV_CANDIDATES

function resolvePriceId(plan: PlanId) {
  const candidates = PLAN_PRICE_ENV_CANDIDATES[plan]
  for (const envName of candidates) {
    const value = process.env[envName]
    if (value) return value
  }
  return null
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[stripe-checkout] unauthorized', {
        userError: userError?.message,
        cookies: cookieStore.getAll().length,
      })

      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const body = (await req.json()) as { plan?: string; planId?: string }
    const requestedPlan = body.planId ?? body.plan

    if (!requestedPlan || !(requestedPlan in PLAN_PRICE_ENV_CANDIDATES)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    const plan = requestedPlan as PlanId
    const priceId = resolvePriceId(plan)

    if (!priceId) {
      return NextResponse.json(
        { error: 'Preço Stripe não configurado' },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',

        payment_method_types: ['card'],

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        customer_email: user.email ?? undefined,

        metadata: {
          user_id: user.id,
          plan,
        },

        subscription_data: {
          metadata: {
            user_id: user.id,
            plan,
          },
        },

        success_url: `${siteUrl}/perfil?payment=success`,
        cancel_url: `${siteUrl}/planos`,
      },
      {
        idempotencyKey: `subscription-checkout:${user.id}:${plan}:${Math.floor(
          Date.now() / 30000
        )}`,
      }
    )

    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout URL indisponível' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('stripe checkout error', error)

    return NextResponse.json(
      { error: 'STRIPE_CHECKOUT_FAILED' },
      { status: 500 }
    )
  }
}
