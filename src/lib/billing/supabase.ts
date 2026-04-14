import type { SupabaseClient } from '@supabase/supabase-js'

import type { BillingEventInsert, BillingValidationResponse, SubscriptionUpsert } from '@/lib/billing/types'
import { isActiveStatus } from '@/lib/billing/mapper'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function adminClient(): SupabaseClient {
  const client = getSupabaseAdminClient()
  if (!client) {
    throw new Error('supabase_admin_unavailable')
  }
  return client
}

export async function insertBillingEvent(event: BillingEventInsert) {
  const supabase = adminClient()
  const { error } = await supabase.from('billing_events').insert({
    event_key: event.eventKey,
    idempotency_key: event.idempotencyKey,
    user_id: event.userId,
    platform: event.platform,
    event_type: event.eventType,
    event_timestamp_ms: event.eventTimestampMs,
    payload: event.payload,
  })

  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`billing_event_insert_failed:${error.message}`)
  }
}

export async function upsertSubscriptionState(change: SubscriptionUpsert) {
  const supabase = adminClient()

  const { data: existing, error: existingError } = await supabase
    .from('billing_subscriptions')
    .select('id, last_event_timestamp_ms')
    .eq('platform', change.platform)
    .eq('external_subscription_id', change.externalSubscriptionId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`billing_subscription_lookup_failed:${existingError.message}`)
  }

  if (existing && Number(existing.last_event_timestamp_ms) > change.eventTimestampMs) {
    return false
  }

  const payload = {
    user_id: change.userId,
    platform: change.platform,
    product_id: change.productId,
    plan_id: change.planId,
    status: change.status,
    is_active: change.isActive,
    environment: change.environment,
    external_subscription_id: change.externalSubscriptionId,
    external_transaction_id: change.externalTransactionId,
    original_transaction_id: change.originalTransactionId,
    purchase_token: change.purchaseToken,
    started_at: change.startedAt,
    expires_at: change.expiresAt,
    canceled_at: change.canceledAt,
    revoked_at: change.revokedAt,
    last_event_timestamp_ms: change.eventTimestampMs,
    raw_source: change.rawSource,
  }

  const { error: subscriptionError } = await supabase
    .from('billing_subscriptions')
    .upsert(payload, { onConflict: 'platform,external_subscription_id' })

  if (subscriptionError) {
    throw new Error(`billing_subscription_upsert_failed:${subscriptionError.message}`)
  }

  const profilePatch = {
    has_active_plan: isActiveStatus(change.status),
    current_plan_id: change.planId,
    subscription_status: change.status,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', change.userId)

  if (profileError) {
    throw new Error(`profile_update_failed:${profileError.message}`)
  }

  return true
}

export function toValidationResponse(change: SubscriptionUpsert): BillingValidationResponse {
  return {
    ok: true,
    platform: change.platform,
    plan: change.planId,
    status: change.status,
    expiresAt: change.expiresAt,
    source: 'validated_server_side',
    externalTransactionId: change.externalTransactionId,
    environment: change.environment,
  }
}
