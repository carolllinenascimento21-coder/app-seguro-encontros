import { buildIdempotencyKey, stableEventKey } from '@/lib/billing/idempotency'
import { parseAppleNotificationPayload, validateApplePurchaseServerSide } from '@/lib/billing/apple'
import { parseGoogleRtdn, validateGooglePurchaseServerSide } from '@/lib/billing/google'
import { bindApplePurchaseToUser, insertBillingEvent, toValidationResponse, upsertSubscriptionState } from '@/lib/billing/supabase'
import type { BillingValidationResponse } from '@/lib/billing/types'

function logBilling(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'billing_mobile', event, ...payload }))
}

export async function validateApplePurchaseAndPersist(input: {
  userId: string
  productId: string
  transactionId?: string
  originalTransactionId?: string
  appAccountToken?: string
  signedTransactionInfo?: string
}): Promise<BillingValidationResponse> {
  if (input.appAccountToken && input.appAccountToken !== input.userId) {
    throw new Error('apple_app_account_token_user_mismatch')
  }

  const normalized = await validateApplePurchaseServerSide(input)

  await bindApplePurchaseToUser({
    userId: normalized.userId,
    originalTransactionId: normalized.originalTransactionId,
    transactionId: normalized.externalTransactionId,
    appAccountToken: input.appAccountToken,
  })

  const idempotencyKey = buildIdempotencyKey([
    'apple_validate',
    normalized.originalTransactionId,
    normalized.externalTransactionId,
    normalized.eventTimestampMs,
  ])

  const eventKey = stableEventKey('apple', normalized.externalTransactionId, 'MANUAL_VALIDATE', normalized.eventTimestampMs)

  await insertBillingEvent({
    eventKey,
    idempotencyKey,
    userId: normalized.userId,
    platform: 'apple',
    eventType: 'MANUAL_VALIDATE',
    eventTimestampMs: normalized.eventTimestampMs,
    payload: normalized.rawSource,
  })

  await upsertSubscriptionState(normalized)
  logBilling('apple_validate_ok', { userId: normalized.userId, tx: normalized.externalTransactionId, status: normalized.status })
  return toValidationResponse(normalized)
}

export async function validateGooglePurchaseAndPersist(input: {
  userId: string
  productId: string
  purchaseToken: string
  packageName: string
}): Promise<BillingValidationResponse> {
  const normalized = await validateGooglePurchaseServerSide(input)

  const idempotencyKey = buildIdempotencyKey([
    'google_validate',
    normalized.purchaseToken,
    normalized.externalTransactionId,
    normalized.eventTimestampMs,
  ])

  const eventKey = stableEventKey('google', normalized.externalTransactionId, 'MANUAL_VALIDATE', normalized.eventTimestampMs)

  await insertBillingEvent({
    eventKey,
    idempotencyKey,
    userId: normalized.userId,
    platform: 'google',
    eventType: 'MANUAL_VALIDATE',
    eventTimestampMs: normalized.eventTimestampMs,
    payload: normalized.rawSource,
  })

  await upsertSubscriptionState(normalized)
  logBilling('google_validate_ok', { userId: normalized.userId, tx: normalized.externalTransactionId, status: normalized.status })
  return toValidationResponse(normalized)
}

export async function processAppleNotification(input: { signedPayload: string }) {
  const parsed = parseAppleNotificationPayload(input.signedPayload)
  if (!parsed.tx.originalTransactionId || !parsed.tx.productId) {
    throw new Error('apple_notification_missing_core_fields')
  }

  const normalized = await validateApplePurchaseServerSide({
    userId: String(parsed.tx.appAccountToken ?? ''),
    productId: parsed.tx.productId,
    transactionId: parsed.tx.transactionId,
    originalTransactionId: parsed.tx.originalTransactionId,
    appAccountToken: parsed.tx.appAccountToken,
  })

  if (!normalized.userId) {
    throw new Error('apple_notification_missing_user_binding')
  }

  const eventTs = Number(parsed.tx.expiresDate ?? Date.now())
  const eventType = `APPLE_${parsed.notificationType}${parsed.subtype ? `_${parsed.subtype}` : ''}`

  await insertBillingEvent({
    eventKey: stableEventKey('apple', normalized.originalTransactionId, eventType, eventTs),
    idempotencyKey: buildIdempotencyKey([eventType, normalized.originalTransactionId, eventTs]),
    userId: normalized.userId,
    platform: 'apple',
    eventType,
    eventTimestampMs: eventTs,
    payload: parsed.raw,
  })

  await upsertSubscriptionState({ ...normalized, eventTimestampMs: eventTs })
}

export async function processGoogleNotification(input: { messageDataBase64: string; fallbackUserId?: string }) {
  const parsed = parseGoogleRtdn(input.messageDataBase64)
  if (!parsed.packageName || !parsed.purchaseToken) throw new Error('google_notification_missing_fields')

  if (!input.fallbackUserId) {
    throw new Error('google_notification_needs_fallback_user_id_or_link_table')
  }

  const normalized = await validateGooglePurchaseServerSide({
    userId: input.fallbackUserId,
    productId: process.env.GOOGLE_DEFAULT_PRODUCT_ID ?? 'br.com.wpssistemas.confiamais.premium.monthly',
    purchaseToken: parsed.purchaseToken,
    packageName: parsed.packageName,
  })

  const eventType = `GOOGLE_RTDM_${parsed.notificationType}`
  await insertBillingEvent({
    eventKey: stableEventKey('google', parsed.purchaseToken, eventType, parsed.eventTimeMillis),
    idempotencyKey: buildIdempotencyKey([eventType, parsed.purchaseToken, parsed.eventTimeMillis]),
    userId: normalized.userId,
    platform: 'google',
    eventType,
    eventTimestampMs: parsed.eventTimeMillis,
    payload: parsed.raw,
  })

  await upsertSubscriptionState({ ...normalized, eventTimestampMs: parsed.eventTimeMillis })
}
