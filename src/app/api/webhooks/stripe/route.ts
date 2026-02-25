// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Mapeie STRIPE PRICE ID -> plans.id (FK em profiles.current_plan_id)
 * Ajuste os valores para os IDs reais da sua tabela public.plans.
 */
const PRICE_TO_PLAN: Record<string, 'premium_monthly' | 'premium_yearly' | 'premium_plus'> = {
  // Assinatura mensal Confia+
  price_1Ssre07IHHkQsIacWeLkInUG: 'premium_monthly',

  // Premium Plus Mensal
  price_1SssHT7IHHkQsIackFlCofn6: 'premium_plus',

  // Premium anual
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
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

async function resolvePlanFromSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (!priceId) return null
  return PRICE_TO_PLAN[priceId] ?? null
}

async function resolvePlanFromCheckoutSession(stripe: Stripe, sessionId: string) {
  // O objeto do evento normalmente NÃO vem com line_items.
  // Então buscamos a sessão expandindo line_items.price.
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
  patch: { status: string; error?: string | null; processed_at?: string | null }
) {
  // não bloqueia o webhook se falhar (observabilidade), mas loga
  const { error } = await supabaseAdmin
    .from('stripe_events')
    .update({
      status: patch.status,
      error: patch.error ?? null,
      processed_at: patch.processed_at ?? new Date().toISOString(),
    })
    .eq('event_id', eventId)

  if (error) {
    console.error('[stripe-webhook] Falha ao atualizar stripe_events:', error)
  }
}

export async function POST(req: Request) {
  const signature = (await headers()).get('stripe-signature')

  if (!signature || !webhookSecret) {
    return jsonErr('Webhook não configurado (signature/secret ausente).', 400)
  }

  const stripe = getStripeClient()
  if (!stripe) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY ausente.')
    return jsonErr('Stripe não configurado.', 500)
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('[stripe-webhook] Assinatura inválida:', error)
    return jsonErr('Assinatura inválida (Stripe signature).', 400)
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    console.info(`[stripe-webhook] Evento ignorado: ${event.type}`)
    return jsonOk()
  }

  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    console.error('[stripe-webhook] Supabase admin indisponível.')
    return jsonErr('Supabase Admin indisponível.', 503)
  }

  // =====================================================
  // 🔒 IDEMPOTÊNCIA GLOBAL POR event.id (RISCO CRÍTICO → resolvido)
  // Requer tabela public.stripe_events com PK(event_id)
  // =====================================================
  const { error: eventInsertError } = await supabaseAdmin.from('stripe_events').insert({
    event_id: event.id,
    event_type: event.type,
  })

  if (eventInsertError) {
    const msg = String((eventInsertError as any).message || '')
    const code = (eventInsertError as any).code

    // Unique violation → evento já processado (Stripe retry/replay)
    if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
      console.info(`[stripe-webhook] Evento duplicado ignorado: ${event.id}`)
      return jsonOk({ duplicate: true })
    }

    // Se a tabela não existir ainda (deploy fora de ordem), não quebra produção:
    // loga e segue sem dedupe (degradação controlada).
    if (code === '42P01' || msg.toLowerCase().includes('does not exist')) {
      console.error(
        '[stripe-webhook] stripe_events não existe (migração pendente). Prosseguindo sem dedupe:',
        eventInsertError
      )
    } else {
      console.error('[stripe-webhook] Erro ao registrar stripe_event:', eventInsertError)
      return jsonErr('Erro interno ao registrar evento Stripe', 500)
    }
  }

  try {
    /**
     * =====================================================
     * CHECKOUT FINALIZADO
     * =====================================================
     */
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // 1) Pega user_id do metadata (ideal)
      let userId = session.metadata?.user_id ?? null

      // 2) Se não veio user_id, tenta achar pelo stripe_customer_id
      const customerId = session.customer?.toString() ?? null
      if (!userId && customerId) {
        userId = await resolveUserIdFromCustomer({ supabaseAdmin, customerId })
      }

      if (!userId) {
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'Sem user_id e sem match por customer.',
        })
        // 200 para não ficar em retry eterno
        return jsonOk({ received: true, warning: 'Sem user_id e sem match por customer.' })
      }

      // ===== ASSINATURAS =====
      if (session.mode === 'subscription') {
        const plan = await resolvePlanFromCheckoutSession(stripe, session.id)
        if (!plan) {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: 'Não conseguiu resolver plano via price.id (PRICE_TO_PLAN).',
          })
          return jsonOk({
            received: true,
            warning: 'Não consegui resolver o plano via price.id. Verifique PRICE_TO_PLAN.',
          })
        }

        const subscriptionId = session.subscription?.toString() ?? null

        const updatePayload: any = {
          current_plan_id: plan,
          subscription_status: 'active',
          has_active_plan: true,
        }

        if (customerId) updatePayload.stripe_customer_id = customerId
        // ⚠️ Exige coluna em profiles. Se não existir, este update falhará.
        if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId

        const { error: updErr } = await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId)

        if (updErr) {
          console.error('[stripe-webhook] Falha ao atualizar profile (subscription):', updErr)
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'failed',
            error: `Falha update profiles subscription: ${String(updErr.message || updErr)}`,
          })
          return jsonErr('Falha ao atualizar assinatura no perfil', 500)
        }

        await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
        return jsonOk()
      }

      // ===== CRÉDITOS =====
      if (session.mode === 'payment') {
        // ✅ Evita conceder crédito sem pagamento confirmado
        if (session.payment_status !== 'paid') {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: `payment_status=${session.payment_status ?? 'unknown'}`,
          })
          return jsonOk({ skipped: 'payment not paid yet' })
        }

        const credits = Number(session.metadata?.credits ?? 0)

        if (credits > 0) {
          const { error: rpcErr } = await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
            user_uuid: userId,
            credit_delta: credits,
            external_ref: session.payment_intent?.toString() ?? session.id,
            transaction_type: 'credit_purchase',
          })

          if (rpcErr) {
            console.error('[stripe-webhook] Erro ao creditar:', rpcErr)
            await markStripeEvent(supabaseAdmin, event.id, {
              status: 'failed',
              error: `Falha RPC credit: ${String(rpcErr.message || rpcErr)}`,
            })
            return jsonErr('Erro ao aplicar créditos', 500)
          }
        }

        await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
        return jsonOk()
      }

      await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
      return jsonOk()
    }

    /**
     * =====================================================
     * UPDATE / CANCELAMENTO DE ASSINATURA
     * =====================================================
     */
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription

      // 1) user_id por metadata (se você configurar subscription_data.metadata no checkout)
      let userId = subscription.metadata?.user_id ?? null

      // 2) fallback por stripe_customer_id
      const customerId = subscription.customer?.toString() ?? null
      if (!userId && customerId) {
        userId = await resolveUserIdFromCustomer({ supabaseAdmin, customerId })
      }

      if (!userId) {
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'Sem user_id e sem match por customer.',
        })
        return jsonOk({ received: true, warning: 'Sem user_id e sem match por customer.' })
      }

      const isActive = subscription.status === 'active' || subscription.status === 'trialing'
      const plan = await resolvePlanFromSubscription(subscription)

      // Se ativo mas não achou plano, NÃO derruba para free.
      const updatePayload: any = {
        subscription_status: subscription.status,
        has_active_plan: isActive,
      }

      if (!isActive) {
        updatePayload.current_plan_id = 'free'
      } else if (plan) {
        updatePayload.current_plan_id = plan
      }

      if (customerId) updatePayload.stripe_customer_id = customerId
      if (subscription.id) updatePayload.stripe_subscription_id = subscription.id

      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (updErr) {
        console.error('[stripe-webhook] Falha ao atualizar profile (sub event):', updErr)
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'failed',
          error: `Falha update profiles sub event: ${String(updErr.message || updErr)}`,
        })
        return jsonErr('Falha ao atualizar assinatura no perfil', 500)
      }

      await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
      return jsonOk()
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer?.toString() ?? null

      let userId: string | null = null
      if (customerId) {
        userId = await resolveUserIdFromCustomer({ supabaseAdmin, customerId })
      }

      if (!userId) {
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'invoice.paid sem match de user.',
        })
        return jsonOk({ received: true, warning: 'invoice.paid sem match de user.' })
      }

      const updatePayload: Record<string, unknown> = {
        subscription_status: 'active',
        has_active_plan: true,
      }

      if (customerId) {
        updatePayload.stripe_customer_id = customerId
      }

      const invoiceSubscription = (invoice as Stripe.Invoice & { subscription?: string | null })
        .subscription
      const subscriptionId = invoiceSubscription ?? null
      if (subscriptionId) {
        updatePayload.stripe_subscription_id = subscriptionId
      }

      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (updErr) {
        console.error('[stripe-webhook] Falha ao atualizar profile (invoice.paid):', updErr)
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'failed',
          error: `Falha update profiles invoice.paid: ${String(updErr.message || updErr)}`,
        })
        return jsonErr('Falha ao atualizar fatura paga no perfil', 500)
      }

      await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
      return jsonOk()
    }

    // fallback
    await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
    return jsonOk()
  } catch (err: any) {
    console.error('[stripe-webhook] Erro inesperado:', err)
    // se a tabela stripe_events existir, marca falha
    await markStripeEvent(supabaseAdmin, event.id, {
      status: 'failed',
      error: String(err?.message || err),
    })
    return jsonErr('Erro interno no webhook', 500)
  }
}
