export const MOBILE_PRODUCT_IDS = {
  premium_monthly: 'br.com.wpssistemas.confiamais.premium.monthly',
  premium_yearly: 'br.com.wpssistemas.confiamais.premium.annual',
} as const

export type CanonicalPlanId = keyof typeof MOBILE_PRODUCT_IDS
export type MobileProductId = (typeof MOBILE_PRODUCT_IDS)[CanonicalPlanId]

const PRODUCT_TO_PLAN: Record<MobileProductId, CanonicalPlanId> = {
  'br.com.wpssistemas.confiamais.premium.monthly': 'premium_monthly',
  'br.com.wpssistemas.confiamais.premium.annual': 'premium_yearly',
}

export function mapProductToPlan(productId: string): CanonicalPlanId | null {
  return (PRODUCT_TO_PLAN as Record<string, CanonicalPlanId | undefined>)[productId] ?? null
}

export function mapPlanToProduct(planId: CanonicalPlanId): MobileProductId {
  return MOBILE_PRODUCT_IDS[planId]
}

export function isMobileAppRuntime() {
  return typeof window !== 'undefined' && Boolean(window.confiaStoreKit)
}

export function detectMobileStorePlatform(payload: unknown): 'apple' | 'google' | null {
  if (!payload || typeof payload !== 'object') return null

  const value = payload as Record<string, unknown>
  const platform = value.platform

  if (platform === 'ios' || platform === 'apple' || platform === 'appstore') {
    return 'apple'
  }

  if (platform === 'android' || platform === 'google' || platform === 'playstore') {
    return 'google'
  }

  if (typeof value.transactionId === 'string' || typeof value.originalTransactionId === 'string') {
    return 'apple'
  }

  if (typeof value.purchaseToken === 'string' || typeof value.packageName === 'string') {
    return 'google'
  }

  return null
}
