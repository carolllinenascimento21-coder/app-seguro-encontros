import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'WEBHOOK_SECRET_MISSING' }, { status: 500 })
  }

  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Erro ao validar webhook Stripe:', error)
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    const userId = metadata.user_id

    if (!userId) {
      console.warn('Webhook sem user_id; ignorando')
      return NextResponse.json({ received: true })
    }

    try {
      if (session.mode === 'subscription') {
        const plan = metadata.plan ?? 'premium'
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan })
          .eq('id', userId)

        if (error) {
          console.error('Erro ao atualizar plano via webhook:', error)
        }
      } else if (session.mode === 'payment') {
        const credits = metadata.credits ? parseInt(metadata.credits, 10) : 0

        if (credits > 0) {
          const { error } = await supabaseAdmin.rpc('add_profile_credits', {
            p_user_id: userId,
            p_amount: credits,
          })

          if (error) {
            console.error('Erro ao adicionar créditos via webhook:', error)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar webhook Stripe:', error)
      return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
