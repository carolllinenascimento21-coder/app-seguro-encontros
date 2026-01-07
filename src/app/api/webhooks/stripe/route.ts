import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ plan, free_queries_used: 0 })
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

  return NextResponse.json({ received: true })
}
