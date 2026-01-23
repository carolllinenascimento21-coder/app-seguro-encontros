import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature')

  if (!signature || !webhookSecret) {
    console.error('Webhook Stripe não configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  const stripe = getStripeClient()

  if (!stripe) {
    console.error('Stripe não configurado para processar webhook')
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
    event.type === 'checkout.session.completed' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    let supabaseAdmin

    try {
      supabaseAdmin = getSupabaseAdminClient()
    } catch (error) {
      const envError = getMissingSupabaseEnvDetails(error)
      if (envError) {
        console.error(envError.message)
        return NextResponse.json({ error: envError.message }, { status: envError.status })
      }
      throw error
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id

      if (!userId) {
        console.error('Checkout sem user_id na metadata')
        return NextResponse.json({ received: true })
      }

      if (session.mode === 'subscription') {
        const plan = session.metadata?.plan ?? 'free'
        const externalReference = session.subscription?.toString() ?? session.id
        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            plan,
            free_queries_used: 0,
            plan_expires_at: null,
            stripe_customer_id: stripeCustomerId ?? null,
            current_plan_id: plan,
            subscription_status: 'active',
            has_active_plan: true,
          })
          .eq('id', userId)

        if (error) {
          console.error('Erro ao atualizar plano após assinatura', error)
        }

        const { error: transactionError } = await supabaseAdmin
          .from('credit_transactions')
          .upsert(
            {
              user_id: userId,
              type: 'subscription_start',
              amount: 0,
              external_reference: externalReference,
            },
            { onConflict: 'external_reference' }
          )

        if (transactionError) {
          console.error('Erro ao registrar transação de assinatura', transactionError)
        }

      } else if (session.mode === 'payment') {
        const credits = Number(session.metadata?.credits ?? 0)
        const externalReference =
          session.payment_intent?.toString() ?? session.id
        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id

        if (stripeCustomerId) {
          const { error: customerError } = await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', userId)

          if (customerError) {
            console.error('Erro ao atualizar customer do Stripe', customerError)
          }
        }

        if (Number.isFinite(credits) && credits > 0) {
          const { error } = await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
            user_uuid: userId,
            credit_delta: credits,
            external_ref: externalReference,
            transaction_type: 'credit_purchase',
          })

          if (error) {
            console.error('Erro ao adicionar créditos após pagamento', error)
          }
        }
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id
      const plan = subscription.metadata?.plan ?? null
      const stripeCustomerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!userId) {
        console.error('Assinatura sem user_id na metadata')
        return NextResponse.json({ received: true })
      }

      const isActive =
        subscription.status === 'active' ||
        subscription.status === 'trialing'

      const updatePayload: Record<string, string | boolean | null> = {
        stripe_customer_id: stripeCustomerId ?? null,
        current_plan_id: plan,
        subscription_status: subscription.status,
        has_active_plan: isActive,
      }

      if (event.type === 'customer.subscription.deleted') {
        updatePayload.plan = 'free'
      } else if (isActive && plan) {
        updatePayload.plan = plan
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (error) {
        console.error('Erro ao atualizar assinatura', error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
