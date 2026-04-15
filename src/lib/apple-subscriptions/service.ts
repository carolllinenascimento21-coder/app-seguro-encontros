import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

import { getPlanFromAppleProduct } from '@/lib/apple-subscriptions/catalog'
import type {
  AppleActivateSubscriptionRequest,
  ApplePlanId,
  AppleSubscriptionResponse,
} from '@/lib/apple-subscriptions/types'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

type ActivateAppleSubscriptionInput = {
  userId: string
  payload: AppleActivateSubscriptionRequest
}

class AppleActivationError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function adminClient(): SupabaseClient {
  const client = getSupabaseAdminClient()
  if (!client) {
    throw new AppleActivationError(500, 'supabase_admin_unavailable')
  }

  return client
}

async function validateSignedTransactionInfoPhase2Placeholder(_: {
  signedTransactionInfo: string
  environment: 'sandbox' | 'production'
}) {
  return { isTrusted: true as const }
}

function isDuplicateKeyError(message?: string | null) {
  return typeof message === 'string' && message.toLowerCase().includes('duplicate key')
}

function canonicalizeAppleTransactionId(input: {
  value: string
  signedTransactionInfo: string
  fallbackSeed: string
  prefix: 'tx' | 'otx'
}) {
  if (input.value !== '0') return input.value

  const hash = createHash('sha256')
    .update(`${input.signedTransactionInfo}:${input.fallbackSeed}`)
    .digest('hex')
    .slice(0, 24)

  return `${input.prefix}_xcode_${hash}`
}

function toResponse(params: {
  productId: string
  plan: ApplePlanId
  transactionId: string
  originalTransactionId: string
  startsAt: string
  expiresAt: string | null
}): AppleSubscriptionResponse {
  return {
    provider: 'apple',
    plan: params.plan,
    status: 'active',
    productId: params.productId,
    transactionId: params.transactionId,
    originalTransactionId: params.originalTransactionId,
    startsAt: params.startsAt,
    expiresAt: params.expiresAt,
  }
}

export async function activateAppleSubscription(
  input: ActivateAppleSubscriptionInput
): Promise<AppleSubscriptionResponse> {
  const supabase = adminClient()
  const plan = getPlanFromAppleProduct(input.payload.productId)

  if (!plan) {
    throw new AppleActivationError(400, 'product_id_not_allowed')
  }

  await validateSignedTransactionInfoPhase2Placeholder({
    signedTransactionInfo: input.payload.signedTransactionInfo,
    environment: input.payload.environment,
  })

  const canonicalTransactionId = canonicalizeAppleTransactionId({
    value: input.payload.transactionId,
    signedTransactionInfo: input.payload.signedTransactionInfo,
    fallbackSeed: `${input.userId}:${input.payload.productId}:${input.payload.purchaseDate}`,
    prefix: 'tx',
  })
  const canonicalOriginalTransactionId = canonicalizeAppleTransactionId({
    value: input.payload.originalTransactionId,
    signedTransactionInfo: input.payload.signedTransactionInfo,
    fallbackSeed: `${input.userId}:${input.payload.productId}:${input.payload.purchaseDate}:original`,
    prefix: 'otx',
  })

  const eventInsertPayload = {
    user_id: input.userId,
    product_id: input.payload.productId,
    transaction_id: canonicalTransactionId,
    original_transaction_id: canonicalOriginalTransactionId,
    purchase_date: input.payload.purchaseDate,
    expiration_date: input.payload.expirationDate,
    environment: input.payload.environment,
    app_account_token: input.payload.appAccountToken,
    signed_transaction_info: input.payload.signedTransactionInfo,
    raw_payload_json: input.payload,
  }

  const { data: insertedEvent, error: eventInsertError } = await supabase
    .from('apple_purchase_events')
    .insert(eventInsertPayload)
    .select('user_id, product_id, transaction_id, original_transaction_id, purchase_date, expiration_date')
    .single()

  let sourceEvent = insertedEvent

  if (eventInsertError) {
    if (!isDuplicateKeyError(eventInsertError.message)) {
      throw new AppleActivationError(500, `apple_purchase_event_insert_failed:${eventInsertError.message}`)
    }

    const { data: existingEvent, error: existingEventError } = await supabase
      .from('apple_purchase_events')
      .select('user_id, product_id, transaction_id, original_transaction_id, purchase_date, expiration_date')
      .eq('transaction_id', canonicalTransactionId)
      .maybeSingle()

    if (existingEventError || !existingEvent) {
      throw new AppleActivationError(500, 'apple_purchase_event_fetch_failed')
    }

    if (existingEvent.user_id !== input.userId) {
      throw new AppleActivationError(409, 'transaction_already_belongs_to_another_user')
    }

    sourceEvent = existingEvent
  }

  if (!sourceEvent) {
    throw new AppleActivationError(500, 'apple_purchase_event_missing_after_insert')
  }

  const subscriptionPayload = {
    user_id: input.userId,
    platform: 'apple',
    product_id: sourceEvent.product_id,
    plan_id: plan,
    status: 'active',
    is_active: true,
    environment: input.payload.environment,
    external_subscription_id: sourceEvent.original_transaction_id,
    external_transaction_id: sourceEvent.transaction_id,
    original_transaction_id: sourceEvent.original_transaction_id,
    purchase_token: null,
    started_at: sourceEvent.purchase_date,
    expires_at: sourceEvent.expiration_date,
    canceled_at: null,
    revoked_at: null,
    last_event_timestamp_ms: new Date(sourceEvent.purchase_date).getTime(),
    raw_source: {
      source: 'apple_activate_subscription_phase1',
      transactionId: sourceEvent.transaction_id,
      originalTransactionId: sourceEvent.original_transaction_id,
      signedTransactionInfo: input.payload.signedTransactionInfo,
    },
  }

  const { error: subscriptionError } = await supabase
    .from('billing_subscriptions')
    .upsert(subscriptionPayload, { onConflict: 'platform,external_subscription_id' })

  if (subscriptionError) {
    throw new AppleActivationError(500, `billing_subscription_upsert_failed:${subscriptionError.message}`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      has_active_plan: true,
      current_plan_id: plan,
      subscription_status: 'active',
    })
    .eq('id', input.userId)

  if (profileError) {
    throw new AppleActivationError(500, `profile_update_failed:${profileError.message}`)
  }

  return toResponse({
    productId: sourceEvent.product_id,
    plan,
    transactionId: sourceEvent.transaction_id,
    originalTransactionId: sourceEvent.original_transaction_id,
    startsAt: new Date(sourceEvent.purchase_date).toISOString(),
    expiresAt: sourceEvent.expiration_date ? new Date(sourceEvent.expiration_date).toISOString() : null,
  })
}

export function isAppleActivationError(error: unknown): error is AppleActivationError {
  return error instanceof AppleActivationError
}
