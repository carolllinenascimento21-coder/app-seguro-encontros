import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const ALLOWED_PLANS = [
  'premium_monthly',
  'premium_plus',
  'premium_yearly',
]

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature')

  if (!signature || !webhookSecret) {
    console.error('Webhook Stripe não configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  const stripe = getStripeClient()
  if (!stripe) {
    console.error('Stripe não configurado')
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('Erro ao validar webhook Stripe', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  if (
    ![
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ].includes(event.type)
  ) {
    return NextResponse.json({ received: true })
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin indisponível' }, { status: 503 })
  }

  /* =====================================================
     CHECKOUT FINALIZADO
  ===================================================== */
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id

    if (!userId) {
      console.error('Checkout sem user_id')
      return NextResponse.json({ received: true })
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id

    /* ---------- ASSINATURA ---------- */
    if (session.mode === 'subscription') {
      const planFromMetadata = session.metadata?.plan
      const plan = ALLOWED_PLANS.includes(planFromMetadata)
        ? planFromMetadata
        : 'free'

      await supabaseAdmin
        .from('profiles')
        .update({
          plan,
          current_plan_id: plan,
          subscription_status: 'active',
          has_active_plan: true,
          stripe_customer_id: stripeCustomerId ?? null,
        })
        .eq('id', userId)

      return NextResponse.json({ received: true })
    }

    /* ---------- CRÉDITOS ---------- */
    if (session.mode === 'payment') {
      const credits = Number(session.metadata?.credits ?? 0)
      const externalReference =
        session.payment_intent?.toString() ?? session.id

      if (stripeCustomerId) {
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', userId)
      }

      if (Number.isFinite(credits) && credits > 0) {
        await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
          user_uuid: userId,
          credit_delta: credits,
          external_ref: externalReference,
          transaction_type: 'credit_purchase',
        })
      }

      return NextResponse.json({ received: true })
    }
  }

  /* =====================================================
     ATUALIZAÇÃO / CANCELAMENTO DE ASSINATURA
  ===================================================== */
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id

    if (!userId) {
      console.error('Assinatura sem user_id')
      return NextResponse.json({ received: true })
    }

    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id

    const isActive =
      subscription.status === 'active' ||
      subscription.status === 'trialing'

    const planFromMetadata = subscription.metadata?.plan
    const plan = ALLOWED_PLANS.includes(planFromMetadata)
      ? planFromMetadata
      : 'free'

    await supabaseAdmin
      .from('profiles')
      .update({
        plan: isActive ? plan : 'free',
        current_plan_id: isActive ? plan : 'free',
        subscription_status: subscription.status,
        has_active_plan: isActive,
        stripe_customer_id: stripeCustomerId ?? null,
      })
      .eq('id', userId)
  }

  return NextResponse.json({ received: true })
}
