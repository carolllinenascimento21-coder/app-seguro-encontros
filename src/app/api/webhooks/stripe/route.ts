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
  'invoice.payment_failed',
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

type WebhookContext = {
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
  eventId: string
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  { supabaseAdmin, eventId }: WebhookContext
) {
  auditLog('checkout.session.completed.received', {
    eventId,
    sessionId: session.id,
    mode: session.mode,
    payment_status: session.payment_status,
    metadata: session.metadata ?? null,
    payment_intent: session.payment_intent?.toString() ?? null,
  })

  let userId = session.metadata?.user_id ?? null
  const customerId = session.customer?.toString() ?? null
  const email =
    session.customer_email ||
    (session as any).receipt_email ||
    (session as any).customer_details?.email ||
    (session as any).billing_details?.email ||
    null

  if (!userId && customerId) {
    const profile = await resolveUserByStripeCustomer(supabaseAdmin, customerId, email)
    userId = profile?.id ?? null
  }

  if (!userId) {
    console.error('❌ Usuário não encontrado para customer:', customerId, email)
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'Sem user_id e sem match por customer.',
    })
    return jsonOk({ received: true, warning: 'Sem user_id e sem match por customer.' })
  }

  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription?.toString() ?? null
    const updatePayload: Record<string, unknown> = {
      subscription_status: 'incomplete',
      has_active_plan: false,
    }

    if (customerId) updatePayload.stripe_customer_id = customerId
    if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId

    const { error: updErr } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId)
    if (updErr) {
      await markStripeEvent(supabaseAdmin, eventId, {
        status: 'failed',
        error: `Falha update profiles subscription checkout: ${String((updErr as any).message || updErr)}`,
      })
      return jsonErr('Falha ao atualizar assinatura no checkout', 500)
    }

    await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
    return jsonOk()
  }

  if (session.mode === 'payment') {
    if (session.payment_status !== 'paid') {
      await markStripeEvent(supabaseAdmin, eventId, {
        status: 'skipped',
        error: `payment_status=${session.payment_status ?? 'unknown'}`,
      })
      return jsonOk({ skipped: 'payment not paid yet' })
    }

    const credits = Number(session.metadata?.credits ?? 0)
    const externalRef = session.payment_intent?.toString() ?? session.id
    if (!Number.isFinite(credits) || credits <= 0) {
      await markStripeEvent(supabaseAdmin, eventId, {
        status: 'skipped',
        error: `credits_invalid=${session.metadata?.credits ?? 'missing'}`,
      })
      return jsonOk({ skipped: 'credits metadata missing/invalid' })
    }

    const { error: rpcErr } = await supabaseAdmin.rpc('add_profile_credits_with_transaction', {
      user_uuid: userId,
      credit_delta: credits,
      external_ref: externalRef,
      transaction_type: 'purchase',
    })

    if (rpcErr) {
      await markStripeEvent(supabaseAdmin, eventId, {
        status: 'failed',
        error: `Falha RPC credit: ${String((rpcErr as any).message || rpcErr)}`,
      })
      return jsonErr('Erro ao aplicar créditos', 500)
    }

    await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
    return jsonOk()
  }

  await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
  return jsonOk()
}

async function handleInvoicePaid(invoice: Stripe.Invoice, { supabaseAdmin, eventId }: WebhookContext) {
  const customerId = invoice.customer?.toString() ?? null
  const subscriptionId =
    (invoice as any).subscription?.toString?.() ?? (invoice as any).subscription ?? null

  console.log('Customer:', customerId)

  if (!customerId || !subscriptionId) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'invoice.paid sem customer ou subscription',
    })
    return jsonOk({ received: true, warning: 'invoice.paid sem customer/subscription.' })
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const plan = priceId ? resolveSubscriptionPlanFromPriceId(priceId) : null
  const planId = plan ? toProfilePlanId(plan) : null
  console.log('Plan:', planId)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) {
    console.error('User not found for customer:', customerId)
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'invoice.paid sem match de profile',
    })
    return jsonOk({ received: true, warning: 'invoice.paid sem match de profile.' })
  }

  const updatePayload: Record<string, unknown> = {
    subscription_status: 'active',
    has_active_plan: true,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
  }
  if (planId) {
    updatePayload.current_plan_id = planId
  }

  const { error: updateError } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', profile.id)
  if (updateError) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'failed',
      error: `Falha update invoice.paid: ${String((updateError as any).message || updateError)}`,
    })
    return jsonErr('Falha ao atualizar fatura paga no perfil', 500)
  }

  console.log('✅ Plano ativado para usuário:', profile.email)
  await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
  return jsonOk()
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  { supabaseAdmin, eventId }: WebhookContext
) {
  const customerId = subscription.customer?.toString() ?? null
  if (!customerId) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'subscription.updated sem customer',
    })
    return jsonOk({ received: true, warning: 'subscription.updated sem customer.' })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'subscription.updated sem profile',
    })
    return jsonOk({ received: true, warning: 'subscription.updated sem profile.' })
  }

  const isCanceledStatus = ['canceled', 'incomplete_expired', 'unpaid', 'past_due'].includes(subscription.status)
  if (!isCanceledStatus) {
    await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
    return jsonOk()
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      has_active_plan: false,
      current_plan_id: 'free',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
    })
    .eq('id', profile.id)

  if (updateError) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'failed',
      error: `Falha update subscription.updated: ${String((updateError as any).message || updateError)}`,
    })
    return jsonErr('Falha ao atualizar assinatura', 500)
  }

  await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
  return jsonOk()
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, { supabaseAdmin, eventId }: WebhookContext) {
  const customerId = invoice.customer?.toString() ?? null
  if (!customerId) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'skipped',
      error: 'invoice.payment_failed sem customer',
    })
    return jsonOk({ received: true, warning: 'invoice.payment_failed sem customer.' })
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      has_active_plan: false,
      current_plan_id: 'free',
      stripe_customer_id: customerId,
    })
    .eq('stripe_customer_id', customerId)

  if (updateError) {
    await markStripeEvent(supabaseAdmin, eventId, {
      status: 'failed',
      error: `Falha update invoice.payment_failed: ${String((updateError as any).message || updateError)}`,
    })
    return jsonErr('Falha ao atualizar cobrança com falha', 500)
  }

  await markStripeEvent(supabaseAdmin, eventId, { status: 'processed' })
  return jsonOk()
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
    console.log('Stripe event:', event.type)
    const ctx: WebhookContext = { supabaseAdmin, eventId: event.id }

    switch (event.type) {
      case 'checkout.session.completed':
        return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, ctx)
      case 'invoice.paid':
        return handleInvoicePaid(event.data.object as Stripe.Invoice, ctx)
      case 'invoice.payment_failed':
        return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, ctx)
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted':
        return handleSubscriptionUpdated(event.data.object as Stripe.Subscription, ctx)
      default:
        await markStripeEvent(supabaseAdmin, event.id, { status: 'processed' })
        return jsonOk()
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Erro inesperado:', err)
    await markStripeEvent(supabaseAdmin, event.id, {
      status: 'failed',
      error: String(err?.message || err),
    })
    return jsonErr('Erro interno no webhook', 500)
  }
}
