import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabasePublicEnv, getMissingSupabaseEnvDetails } from '@/lib/env'
import { getSiteUrl } from '@/lib/billing'

const PLAN_ALIAS_MAP: Record<
  string,
  'premium_monthly' | 'premium_yearly' | 'premium_plus'
> = {
  premium_mensal: 'premium_monthly',
  premium_anual: 'premium_yearly',
  premium_plus: 'premium_plus',
  premium_monthly: 'premium_monthly',
  premium_yearly: 'premium_yearly',
}

const PLAN_PRICE_ENV: Record<
  'premium_monthly' | 'premium_yearly' | 'premium_plus',
  string
> = {
  premium_monthly: 'STRIPE_PRICE_PREMIUM_MONTHLY',
  premium_yearly: 'STRIPE_PRICE_PREMIUM_YEARLY',
  premium_plus: 'STRIPE_PRICE_PREMIUM_PLUS',
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
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  const body = await req.json()
  const stripe = getStripeClient()

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl()

  try {
    /* =====================================================
       NORMALIZA PLANO
    ===================================================== */
    const normalizedPlan = PLAN_ALIAS_MAP[body.planId]

    if (!normalizedPlan) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    const priceEnv = PLAN_PRICE_ENV[normalizedPlan]
    const priceId = process.env[priceEnv]

    if (!priceId) {
      return NextResponse.json(
        { error: 'Preço não configurado no ambiente' },
        { status: 500 }
      )
    }

    /* =====================================================
       CRIA / RECUPERA CUSTOMER
    ===================================================== */
    const existingCustomer = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    })

    const customer =
      existingCustomer.data.length > 0
        ? existingCustomer.data[0]
        : await stripe.customers.create({
            email: user.email!,
            metadata: {
              user_id: user.id,
            },
          })

    /* =====================================================
       CRIA SESSION
    ===================================================== */
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${siteUrl}/planos?status=success`,
      cancel_url: `${siteUrl}/planos?status=cancel`,

      metadata: {
        user_id: user.id,
        plan: normalizedPlan,
      },

      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: normalizedPlan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[checkout] erro stripe:', error)

    return NextResponse.json(
      { error: 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
