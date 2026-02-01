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
  let body: { mode: 'subscription'; planId: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Payload inválido' },
      { status: 400 }
    )
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

  /* =====================================================
     5️⃣ Stripe
  ===================================================== */
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe não configurado' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl()

  try {
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
