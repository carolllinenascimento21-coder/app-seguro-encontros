import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * 🔐 Padrão interno do sistema (NÃO mudar banco)
 */
const PLAN_MAP: Record<
  string,
  'premium_monthly' | 'premium_yearly' | 'premium_plus'
> = {
  // aliases frontend (pt-BR)
  premium_mensal: 'premium_monthly',
  premium_anual: 'premium_yearly',
  premium_plus: 'premium_plus',

  // aliases defensivos
  premium_monthly: 'premium_monthly',
  premium_yearly: 'premium_yearly',
}

/**
 * Eventos aceitos
 */
const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature')

  if (!signature || !webhookSecret) {
    console.error('[stripe-webhook] assinatura ausente')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[stripe-webhook] assinatura inválida', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (!HANDLED_EVENTS.includes(event.type)) {
    return NextResponse.json({ received: true })
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
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

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin indisponível' },
      { status: 503 }
    )
  }

  /* =====================================================
     CHECKOUT FINALIZADO
  ===================================================== */
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id

    if (!userId) {
      console.warn('[stripe-webhook] checkout sem user_id')
      return NextResponse.json({ received: true })
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null

    /* ---------- ASSINATURA ---------- */
    if (session.mode === 'subscription') {
      const rawPlan = session.metadata?.plan
      const plan = rawPlan ? PLAN_MAP[rawPlan] : null

      if (!plan) {
        console.error('[stripe-webhook] plano inválido', rawPlan)
        return NextResponse.json({ received: true })
      }

      await supabaseAdmin
        .from('profiles')
        .update({
          current_plan_id: plan,
          subscription_status: 'active',
          has_active_plan: true,
          stripe_customer_id: stripeCustomerId,
          free_queries_used: 0,
        })
        .eq('id', userId)

      // 📊 analytics (não bloqueante)
      try {
        await supabaseAdmin.from('analytics_events').insert({
          user_id: userId,
          event_name: 'subscription_activated',
          metadata: { plan, source: 'stripe' },
        })
      } catch (e) {
        console.warn('[analytics] falha ao registrar subscription_activated')
      }

      return NextResponse.json({ received: true })
    }

    /* ---------- CRÉDITOS ---------- */
    if (session.mode === 'payment') {
      const credits = Number(session.metadata?.credits ?? 0)
      const externalReference =
        session.payment_intent?.toString() ?? session.id

      if (Number.isFinite(credits) && credits > 0) {
        await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
          user_uuid: userId,
          credit_delta: credits,
          external_ref: externalReference,
          transaction_type: 'credit_purchase',
        })

        try {
          await supabaseAdmin.from('analytics_events').insert({
            user_id: userId,
            event_name: 'credits_purchased',
            metadata: { credits, source: 'stripe' },
          })
        } catch (e) {
          console.warn('[analytics] falha ao registrar credits_purchased')
        }
      }

      return NextResponse.json({ received: true })
    }
  }

  /* =====================================================
     ATUALIZAÇÃO / CANCELAMENTO
  ===================================================== */
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata?.user_id

    if (!userId) {
      console.warn('[stripe-webhook] subscription sem user_id')
      return NextResponse.json({ received: true })
    }

    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null

    const isActive =
      subscription.status === 'active' ||
      subscription.status === 'trialing'

    const rawPlan = subscription.metadata?.plan
    const plan = rawPlan ? PLAN_MAP[rawPlan] : null

    await supabaseAdmin
      .from('profiles')
      .update({
        current_plan_id: isActive && plan ? plan : 'free',
        subscription_status: subscription.status,
        has_active_plan: isActive,
        stripe_customer_id: stripeCustomerId,
      })
      .eq('id', userId)

    try {
      await supabaseAdmin.from('analytics_events').insert({
        user_id: userId,
        event_name: isActive
          ? 'subscription_updated'
          : 'subscription_canceled',
        metadata: { plan, status: subscription.status },
      })
    } catch (e) {
      console.warn('[analytics] falha ao registrar subscription update/cancel')
    }
  }

  return NextResponse.json({ received: true })
}
