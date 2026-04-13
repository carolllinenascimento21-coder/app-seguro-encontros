// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { resolveSubscriptionPlanFromPriceId, toProfilePlanId } from '@/lib/billing'
import { stripe } from '@/lib/stripe/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

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

function auditLog(event: string, payload: Record<string, unknown>) {
  console.log(`[AUDIT] ${event}`, payload)
}

async function resolveUserByStripeCustomer(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  customerId: string,
  email?: string | null
) {
  const { data: byCustomer, error: customerError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!customerError && byCustomer) return byCustomer

  if (email) {
    const { data: byEmail, error: emailError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (!emailError && byEmail) {
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', byEmail.id)

      return byEmail
    }
  }

  return null
}

async function resolvePlanFromSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (!priceId) return null
  return resolveSubscriptionPlanFromPriceId(priceId)
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
  return resolveSubscriptionPlanFromPriceId(priceId)
}

function resolvePlanFromInvoice(invoice: Stripe.Invoice) {
  const price = invoice.lines.data?.[0]?.pricing?.price_details?.price
  const priceId = typeof price === 'string' ? price : price?.id
  if (!priceId) return null
  return resolveSubscriptionPlanFromPriceId(priceId)
}

async function markStripeEvent(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  eventId: string,
  patch: { status: string; error?: string | null; processed_at?: string | null }
) {
  // Observabilidade: não bloqueia o webhook se falhar, mas loga
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
  const headerStore = await headers()
  const signature = headerStore.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return jsonErr('Webhook não configurado (signature/secret ausente).', 400)
  }

  // Stripe exige corpo RAW (req.text) para validar assinatura
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
  // 🔒 IDEMPOTÊNCIA GLOBAL POR event.id
  // Requer tabela public.stripe_events com PK(event_id)
  // =====================================================
  const { error: eventInsertError } = await supabaseAdmin.from('stripe_events').insert({
    event_id: event.id,
    event_type: event.type,
  })

  if (eventInsertError) {
    const msg = String((eventInsertError as any).message || '')
    const code = (eventInsertError as any).code

    // Unique violation → evento já registrado, decide pelo status salvo
    if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
      const { data: existingEvent, error: existingEventError } = await supabaseAdmin
        .from('stripe_events')
        .select('status')
        .eq('event_id', event.id)
        .maybeSingle()

      if (existingEventError) {
        console.error('[stripe-webhook] Erro ao consultar stripe_event existente:', existingEventError)
        return jsonErr('Erro interno ao consultar evento Stripe', 500)
      }

      const existingStatus = existingEvent?.status ?? 'processed'
      if (existingStatus === 'processed' || existingStatus === 'skipped') {
        console.info(`[stripe-webhook] Evento duplicado ignorado: ${event.id} status=${existingStatus}`)
        return jsonOk({ duplicate: true, status: existingStatus })
      }

      console.warn(`[stripe-webhook] Reprocessando evento ${event.id} com status anterior=${existingStatus}`)
      await markStripeEvent(supabaseAdmin, event.id, {
        status: 'received',
        error: null,
      })
    }

    // Se a tabela não existir ainda, degrada com log (não quebra produção)
    else if (code === '42P01' || msg.toLowerCase().includes('does not exist')) {
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

      auditLog('checkout.session.completed.received', {
        eventId: event.id,
        sessionId: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        metadata: session.metadata ?? null,
        payment_intent: session.payment_intent?.toString() ?? null,
      })

      // 1) user_id do metadata (ideal)
      let userId = session.metadata?.user_id ?? null

      // 2) fallback por stripe_customer_id (+ email para autocorreção)
      const obj = event.data.object as any
      const customerId = obj.customer?.toString() ?? null
      const email =
        obj.customer_email ||
        obj.receipt_email ||
        obj.customer_details?.email ||
        obj.billing_details?.email ||
        null
      if (!userId && customerId) {
        const profile = await resolveUserByStripeCustomer(supabaseAdmin, customerId, email)
        userId = profile?.id ?? null
      }

      if (!userId) {
        console.error('❌ Usuário não encontrado para customer:', customerId, email)
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'Sem user_id e sem match por customer.',
        })
        return jsonOk({ received: true, warning: 'Sem user_id e sem match por customer.' })
      }

      // ===== ASSINATURAS =====
      if (session.mode === 'subscription') {
        const plan = await resolvePlanFromCheckoutSession(stripe, session.id)
        if (!plan) {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: 'Não conseguiu resolver plano via price.id (env de planos).',
          })
          return jsonOk({
            received: true,
            warning: 'Não consegui resolver o plano via price.id. Verifique envs STRIPE_PRICE_* do plano.',
          })
        }

        const subscriptionId = session.subscription?.toString() ?? null

        const updatePayload: Record<string, unknown> = {
          current_plan_id: toProfilePlanId(plan),
          subscription_status: 'active',
          has_active_plan: true,
        }

        if (customerId) updatePayload.stripe_customer_id = customerId
        if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId

        const { error: updErr } = await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId)

        if (updErr) {
          console.error('[stripe-webhook] Falha ao atualizar profile (subscription):', updErr)
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'failed',
            error: `Falha update profiles subscription: ${String((updErr as any).message || updErr)}`,
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
          auditLog('checkout.session.completed.payment.skipped_unpaid', {
            eventId: event.id,
            sessionId: session.id,
            payment_status: session.payment_status ?? 'unknown',
          })

          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: `payment_status=${session.payment_status ?? 'unknown'}`,
          })
          return jsonOk({ skipped: 'payment not paid yet' })
        }

        const credits = Number(session.metadata?.credits ?? 0)
        const externalRef = session.payment_intent?.toString() ?? session.id

        auditLog('checkout.session.completed.payment.parsed', {
          eventId: event.id,
          sessionId: session.id,
          credits,
          external_reference: externalRef,
          metadata_credits: session.metadata?.credits ?? null,
        })

        if (!Number.isFinite(credits) || credits <= 0) {
          await markStripeEvent(supabaseAdmin, event.id, {
            status: 'skipped',
            error: `credits_invalid=${session.metadata?.credits ?? 'missing'}`,
          })

          auditLog('checkout.session.completed.payment.skipped_invalid_credits', {
            eventId: event.id,
            sessionId: session.id,
            metadata: session.metadata ?? null,
          })

          return jsonOk({ skipped: 'credits metadata missing/invalid' })
        }

        if (credits > 0) {
          auditLog('checkout.session.completed.payment.rpc_call', {
            eventId: event.id,
            sessionId: session.id,
            userId,
            credits,
            external_reference: externalRef,
          })

          const { error: rpcErr } = await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
            user_uuid: userId,
            credit_delta: credits,
            external_ref: externalRef,
            transaction_type: 'purchase',
          })

          if (rpcErr) {
            console.error('[stripe-webhook] Erro ao creditar:', rpcErr)
            auditLog('checkout.session.completed.payment.rpc_error', {
              eventId: event.id,
              sessionId: session.id,
              error: String((rpcErr as any).message || rpcErr),
            })

            await markStripeEvent(supabaseAdmin, event.id, {
              status: 'failed',
              error: `Falha RPC credit: ${String((rpcErr as any).message || rpcErr)}`,
            })
            return jsonErr('Erro ao aplicar créditos', 500)
          }

          auditLog('checkout.session.completed.payment.rpc_success', {
            eventId: event.id,
            sessionId: session.id,
            userId,
            credits,
            external_reference: externalRef,
          })
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

      // 2) fallback por stripe_customer_id (+ email para autocorreção)
      const customerId = subscription.customer?.toString() ?? null
      const email =
        (subscription as any).customer_email ||
        (subscription as any).customer_details?.email ||
        null
      if (!userId && customerId) {
        const profile = await resolveUserByStripeCustomer(supabaseAdmin, customerId, email)
        userId = profile?.id ?? null
      }

      if (!userId) {
        console.error('❌ Usuário não encontrado para customer:', customerId, email)
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'skipped',
          error: 'Sem user_id e sem match por customer.',
        })
        return jsonOk({ received: true, warning: 'Sem user_id e sem match por customer.' })
      }

      const isActive = subscription.status === 'active' || subscription.status === 'trialing'
      const plan = await resolvePlanFromSubscription(subscription)

      const updatePayload: Record<string, unknown> = {
        subscription_status: subscription.status,
        has_active_plan: isActive,
      }

      // Se não ativo → free. Se ativo e tem plan → atualiza. Se ativo e não achou plan → não derruba.
      if (!isActive) {
        updatePayload.current_plan_id = 'free'
      } else if (plan) {
        updatePayload.current_plan_id = toProfilePlanId(plan)
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
          error: `Falha update profiles sub event: ${String((updErr as any).message || updErr)}`,
        })
        return jsonErr('Falha ao atualizar assinatura no perfil', 500)
      }

      await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
      return jsonOk()
    }

    /**
     * =====================================================
     * FATURA PAGA
     * =====================================================
     */
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer?.toString() ?? null
      const email =
        invoice.customer_email ||
        (invoice as any).receipt_email ||
        (invoice as any).customer_details?.email ||
        (invoice as any).billing_details?.email ||
        null

      auditLog('invoice.paid.received', {
        eventId: event.id,
        invoiceId: invoice.id,
        customerId,
        subscriptionId: (invoice as any).subscription?.toString?.() ?? (invoice as any).subscription ?? null,
      })

      let userId: string | null = null
      if (customerId) {
        const profile = await resolveUserByStripeCustomer(supabaseAdmin, customerId, email)
        userId = profile?.id ?? null
      }

      if (!userId) {
        console.error('❌ Usuário não encontrado para customer:', customerId, email)
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

      const plan = resolvePlanFromInvoice(invoice)
      if (plan) {
        updatePayload.current_plan_id = toProfilePlanId(plan)
      }

      if (customerId) updatePayload.stripe_customer_id = customerId

      const subscriptionId = (invoice as any).subscription?.toString?.() ?? (invoice as any).subscription ?? null
      if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId

      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (updErr) {
        console.error('[stripe-webhook] Falha ao atualizar profile (invoice.paid):', updErr)
        await markStripeEvent(supabaseAdmin, event.id, {
          status: 'failed',
          error: `Falha update profiles invoice.paid: ${String((updErr as any).message || updErr)}`,
        })
        return jsonErr('Falha ao atualizar fatura paga no perfil', 500)
      }

      await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
      return jsonOk()
    }

    await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
    return jsonOk()
  } catch (err: any) {
    console.error('[stripe-webhook] Erro inesperado:', err)
    await markStripeEvent(supabaseAdmin, event.id, {
      status: 'failed',
      error: String(err?.message || err),
    })
    return jsonErr('Erro interno no webhook', 500)
  }
}
