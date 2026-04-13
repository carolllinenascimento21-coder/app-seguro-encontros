import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { resolveSubscriptionPriceId, subscriptionPriceEnvCandidates } from '@/lib/billing'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'

type PlanId = keyof typeof subscriptionPriceEnvCandidates

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

    if (!requestedPlan || !(requestedPlan in subscriptionPriceEnvCandidates)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    const plan = requestedPlan as PlanId
    const priceId = resolveSubscriptionPriceId(plan)

    if (!priceId) {
      return NextResponse.json(
        { error: 'Preço Stripe não configurado' },
        { status: 500 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[stripe-checkout] profile_not_found', {
        userId: user.id,
        profileError: profileError?.message,
      })

      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email ?? undefined,
        metadata: { user_id: profile.id },
      })

      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.id)
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

        customer: customerId,

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
