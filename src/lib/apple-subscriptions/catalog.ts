import type { ApplePlanId } from '@/lib/apple-subscriptions/types'

export const APPLE_PRODUCT_PLAN_CATALOG: Record<string, ApplePlanId> = {
  'br.com.wpssistemas.confiamais.premium.monthly': 'premium_monthly',
  'br.com.wpssistemas.confiamais.premium.annual': 'premium_annual',
  'br.com.wpssistemas.confiamais.premium.plus': 'premium_plus',
}

export function getPlanFromAppleProduct(productId: string): ApplePlanId | null {
  return APPLE_PRODUCT_PLAN_CATALOG[productId] ?? null
}
