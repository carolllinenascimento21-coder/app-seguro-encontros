export type BillingPlatform = 'apple' | 'google'

export type InternalSubscriptionStatus =
  | 'active'
  | 'trial'
  | 'grace_period'
  | 'billing_retry'
  | 'paused'
  | 'canceled'
  | 'expired'
  | 'refunded'
  | 'revoked'
  | 'incomplete'

export type InternalPlanId = 'premium_monthly' | 'premium_yearly'

export type SubscriptionUpsert = {
  userId: string
  platform: BillingPlatform
  productId: string
  planId: InternalPlanId
  status: InternalSubscriptionStatus
  externalSubscriptionId: string
  externalTransactionId: string
  originalTransactionId: string
  purchaseToken: string | null
  environment: 'production' | 'sandbox'
  isActive: boolean
  startedAt: string | null
  expiresAt: string | null
  canceledAt: string | null
  revokedAt: string | null
  eventTimestampMs: number
  rawSource: Record<string, unknown>
}

export type BillingEventInsert = {
  eventKey: string
  idempotencyKey: string
  userId: string | null
  platform: BillingPlatform
  eventType: string
  eventTimestampMs: number
  payload: Record<string, unknown>
}

export type BillingValidationResponse = {
  ok: true
  platform: BillingPlatform
  plan: InternalPlanId
  status: InternalSubscriptionStatus
  expiresAt: string | null
  source: 'validated_server_side'
  externalTransactionId: string
  environment: 'production' | 'sandbox'
}
