import type { InternalPlanId } from '@/lib/billing/types'

export const BILLING_PRODUCT_CATALOG = {
  'br.com.wpssistemas.confiamais.premium.monthly': 'premium_monthly',
  'br.com.wpssistemas.confiamais.premium.annual': 'premium_yearly',
} as const satisfies Record<string, InternalPlanId>

export type AllowedProductId = keyof typeof BILLING_PRODUCT_CATALOG

export function assertAllowedProduct(productId: string): asserts productId is AllowedProductId {
  if (!(productId in BILLING_PRODUCT_CATALOG)) {
    throw new Error(`product_id_not_allowed:${productId}`)
  }
}

export function planFromProduct(productId: string): InternalPlanId {
  assertAllowedProduct(productId)
  return BILLING_PRODUCT_CATALOG[productId]
}
