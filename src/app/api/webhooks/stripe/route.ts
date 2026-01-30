import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const PLAN_MAP: Record<string, 'premium_monthly' | 'premium_yearly' | 'premium_plus'> = {
  premium_mensal: 'premium_monthly',
  premium_anual: 'premium_yearly',
  premium_plus: 'premium_plus',
  premium_monthly: 'premium_monthly',
  premium_yearly: 'premium_yearly',
}

const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  const stripe = getStripeClient()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (!HANDLED_EVENTS.includes(event.type)) {
    return NextResponse.json({ received: true })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase indisponível' }, { status: 503 })
  }

  /* =====================================================
     CHECKOUT FINALIZADO
  ===================================================== */
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id

    if (!userId) return NextResponse.json({ received: true })

    /* ===== ASSINATURAS ===== */
    if (session.mode === 'subscription') {
      const rawPlan = session.metadata?.plan
      const plan = rawPlan ? PLAN_MAP[rawPlan] : null

      if (!plan) return NextResponse.json({ received: true })

      await supabaseAdmin
        .from('profiles')
        .update({
          current_plan_id: plan,
          subscription_status: 'active',
          has_active_plan: true,
          stripe_customer_id: session.customer?.toString(),
        })
        .eq('id', userId)

      return NextResponse.json({ received: true })
    }

    /* ===== CRÉDITOS ===== */
    if (session.mode === 'payment') {
      const credits = Number(session.metadata?.credits ?? 0)

      if (credits > 0) {
        await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
          user_uuid: userId,
          credit_delta: credits,
          external_ref: session.payment_intent?.toString() ?? session.id,
          transaction_type: 'credit_purchase',
        })
      }

      return NextResponse.json({ received: true })
    }
  }

  /* =====================================================
     CANCELAMENTO / UPDATE ASSINATURA
  ===================================================== */
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id

    if (!userId) return NextResponse.json({ received: true })

    const isActive =
      subscription.status === 'active' || subscription.status === 'trialing'

    const plan = PLAN_MAP[subscription.metadata?.plan ?? '']

    await supabaseAdmin
      .from('profiles')
      .update({
        current_plan_id: isActive && plan ? plan : 'free',
        subscription_status: subscription.status,
        has_active_plan: isActive,
      })
      .eq('id', userId)
  }

  return NextResponse.json({ received: true })
}
