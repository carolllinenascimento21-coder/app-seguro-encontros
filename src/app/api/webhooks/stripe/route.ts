// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const PRICE_TO_PLAN: Record<string, 'premium_monthly' | 'premium_yearly' | 'premium_plus'> = {
  price_1Ssre07IHHkQsIacWeLkInUG: 'premium_monthly',
  price_1SssHT7IHHkQsIackFlCofn6: 'premium_plus',
  price_1St4jv7IHHkQsIac8a8yKmJb: 'premium_yearly',
}

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
])

function jsonOk(data: any = { received: true }) {
  return NextResponse.json(data, { status: 200 })
}

function jsonErr(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

async function resolveUserIdFromCustomer({
  supabaseAdmin,
  customerId,
}: {
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
  customerId: string
}) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  return data?.id ?? null
}

async function resolvePlanFromCheckoutSession(stripe: Stripe, sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  })

  const price = session.line_items?.data?.[0]?.price
  const priceId = typeof price === 'object' ? price?.id : null

  if (!priceId) return null
  return PRICE_TO_PLAN[priceId] ?? null
}

async function markStripeEvent(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  eventId: string,
  patch: { status: string; error?: string | null }
) {
  await supabaseAdmin
    .from('stripe_events')
    .update({
      status: patch.status,
      error: patch.error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)
}

export async function POST(req: Request) {
  const signature = (await headers()).get('stripe-signature')

  if (!signature || !webhookSecret) {
    return jsonErr('Webhook não configurado.', 400)
  }

  const stripe = getStripeClient()
  const supabaseAdmin = getSupabaseAdminClient()

  if (!stripe || !supabaseAdmin) {
    return jsonErr('Infra não configurada.', 500)
  }

  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    return jsonErr('Assinatura inválida.', 400)
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return jsonOk()
  }

  // 🔒 IDEMPOTÊNCIA GLOBAL
  const { error: insertError } = await supabaseAdmin.from('stripe_events').insert({
    event_id: event.id,
    event_type: event.type,
  })

  if (insertError) {
    const code = (insertError as any).code
    if (code === '23505') {
      // evento já processado
      return jsonOk({ duplicate: true })
    }
    return jsonErr('Erro ao registrar evento.', 500)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      let userId = session.metadata?.user_id ?? null
      const customerId = session.customer?.toString() ?? null

      if (!userId && customerId) {
        userId = await resolveUserIdFromCustomer({ supabaseAdmin, customerId })
      }

      if (!userId) {
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'Sem user_id.',
        })
        return jsonOk()
      }

      // =============================
      // ASSINATURA
      // =============================
      if (session.mode === 'subscription') {
        const plan = await resolvePlanFromCheckoutSession(stripe, session.id)

        if (!plan) {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'failed',
            error: 'Plano não resolvido.',
          })
          return jsonErr('Plano não resolvido.', 500)
        }

        const subscriptionId = session.subscription?.toString() ?? null

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            current_plan_id: plan,
            subscription_status: 'active',
            has_active_plan: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId)

        if (error) {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'failed',
            error: error.message,
          })
          return jsonErr('Erro ao atualizar assinatura.', 500)
        }

        await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
        return jsonOk()
      }

      // =============================
      // CRÉDITOS
      // =============================
      if (session.mode === 'payment') {
        if (session.payment_status !== 'paid') {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: `payment_status=${session.payment_status}`,
          })
          return jsonOk()
        }

        const credits = Number(session.metadata?.credits ?? 0)

        if (credits > 0) {
          const { error } = await supabaseAdmin.rpc(
            'add_profile_credits_with_transaction',
            {
              user_uuid: userId,
              credit_delta: credits,
              external_ref:
                session.payment_intent?.toString() ?? session.id,
              type: 'purchase', // ✅ compatível com CHECK constraint
            }
          )

          if (error) {
            await markStripeEvent(supabaseAdmin, event.id, {
              status: 'failed',
              error: error.message,
            })
            return jsonErr('Erro ao aplicar créditos.', 500)
          }
        }

        await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
        return jsonOk()
      }
    }

    await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
    return jsonOk()
  } catch (err: any) {
    await markStripeEvent(supabaseAdmin, event.id, {
      status: 'failed',
      error: err?.message ?? 'Erro inesperado',
    })
    return jsonErr('Erro interno no webhook.', 500)
  }
}
