import type { InternalSubscriptionStatus } from '@/lib/billing/types'

const ACTIVE_STATES = new Set<InternalSubscriptionStatus>(['active', 'trial', 'grace_period'])

export function isActiveStatus(status: InternalSubscriptionStatus) {
  return ACTIVE_STATES.has(status)
}

export function mapAppleStatus(payload: {
  expiresDateMs?: number
  revocationDateMs?: number
  gracePeriodExpiresDateMs?: number
  isInBillingRetryPeriod?: boolean
  offerType?: number
}): InternalSubscriptionStatus {
  if (payload.revocationDateMs) return 'revoked'

  const now = Date.now()
  if (payload.gracePeriodExpiresDateMs && payload.gracePeriodExpiresDateMs > now) {
    return 'grace_period'
  }

  if (payload.isInBillingRetryPeriod) return 'billing_retry'

  if (payload.expiresDateMs && payload.expiresDateMs <= now) return 'expired'

  if (payload.offerType === 1) return 'trial'

  return 'active'
}

export function mapGoogleStatus(subscriptionState: string | undefined): InternalSubscriptionStatus {
  switch (subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return 'active'
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'grace_period'
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return 'billing_retry'
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'paused'
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'canceled'
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired'
    case 'SUBSCRIPTION_STATE_PENDING':
      return 'incomplete'
    default:
      return 'incomplete'
  }
}
