import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabasePublicEnv, getMissingSupabaseEnvDetails } from '@/lib/env'
import { getSiteUrl } from '@/lib/billing'

/**
 * 🔐 Normalização de planos
 * Frontend → padrão interno / ENV
 */
const PLAN_ALIAS_MAP: Record<string, 'premium_monthly' | 'premium_yearly' | 'premium_plus'> = {
  premium_mensal: 'premium_monthly',
  premium_anual: 'premium_yearly',
  premium_plus: 'premium_plus',

  // defensivo
  premium_monthly: 'premium_monthly',
  premium_yearly: 'premium_yearly',
}

/**
 * 🔐 ENV por plano normalizado
 */
const PLAN_PRICE_ENV: Record<
  'premium_monthly' | 'premium_yearly' | 'premium_plus',
  string
> = {
  premium_monthly: 'STRIPE_PRICE_PREMIUM_MONTHLY',
  premium_yearly: 'STRIPE_PRICE_PREMIUM_YEARLY',
  premium_plus: 'STRIPE_PRICE_PREMIUM_PLUS',
}

const STRIPE_PRICE_IDS = new Set([
  'price_1Ssre07IHHkQsIacWeLkInUG',
  'price_1SssHT7IHHkQsIackFlCofn6',
  'price_1St4jv7IHHkQsIac8a8yKmJb',
  'price_1Sv4xr7IHHkQsIacMx3fvNx5',
  'price_1Sv5Bu7IHHkQsIactQqeH4QO',
  'price_1Sv5EK7IHHkQsIacjgZYWIBr',
])

export async function POST(req: Request) {
  /* =====================================================
     1️⃣ Validação de ambiente Supabase
  ===================================================== */
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

  /* =====================================================
     2️⃣ Autenticação (opcional)
  ===================================================== */
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  /* =====================================================
     3️⃣ Payload
  ===================================================== */
  let body: { priceId?: string; mode?: 'subscription'; planId?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Payload inválido' },
      { status: 400 }
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
    if (body.priceId) {
      if (!STRIPE_PRICE_IDS.has(body.priceId)) {
        return NextResponse.json(
          { error: 'Preço inválido' },
          { status: 400 }
        )
      }

      const price = await stripe.prices.retrieve(body.priceId)
      const mode: Stripe.Checkout.SessionCreateParams.Mode = price.recurring
        ? 'subscription'
        : 'payment'
      const metadata = user
        ? { user_id: user.id, price_id: body.priceId }
        : { price_id: body.priceId }

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: [
          {
            price: body.priceId,
            quantity: 1,
          },
        ],
        customer_email: user?.email ?? undefined,
        success_url: `${siteUrl}/planos?status=success`,
        cancel_url: `${siteUrl}/planos?status=cancel`,
        metadata,
        ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
      })

      return NextResponse.json({ url: session.url })
    }

    if (body.mode !== 'subscription' || !body.planId) {
      return NextResponse.json(
        { error: 'Dados de checkout inválidos' },
        { status: 400 }
      )
    }

    /* =====================================================
       4️⃣ Normaliza plano
    ===================================================== */
    const normalizedPlan = PLAN_ALIAS_MAP[body.planId]

    if (!normalizedPlan) {
      console.error('[checkout] plano inválido:', body.planId)
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    const priceEnv = PLAN_PRICE_ENV[normalizedPlan]
    const priceId = process.env[priceEnv]

    if (!priceId) {
      console.error('[checkout] ENV ausente:', priceEnv)
      return NextResponse.json(
        { error: 'Preço não configurado no ambiente' },
        { status: 500 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user?.email ?? undefined,
      success_url: `${siteUrl}/planos?status=success`,
      cancel_url: `${siteUrl}/planos?status=cancel`,
      metadata: user
        ? {
            user_id: user.id,
            plan: normalizedPlan,
          }
        : {
            plan: normalizedPlan,
          },
      subscription_data: {
        metadata: user
          ? {
              user_id: user.id,
              plan: normalizedPlan,
            }
          : {
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
