import { isMobileAppRuntime, mapPlanToProduct, type CanonicalPlanId } from '@/lib/mobile-billing'

type StripeCheckoutFn = (planId: CanonicalPlanId) => Promise<void>

type PurchasePayload = {
  productId: string
  purchaseData: unknown
}

async function validateMobilePurchase(payload: PurchasePayload) {
  const response = await fetch('/api/mobile/validate-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Falha ao validar compra mobile')
  }

  return data
}

export async function purchasePlan(planId: CanonicalPlanId, stripeCheckout: StripeCheckoutFn) {
  if (!isMobileAppRuntime()) {
    await stripeCheckout(planId)
    return
  }

  const productId = mapPlanToProduct(planId)
  const purchaseData = await window.confiaStoreKit!.purchase(productId)

  await validateMobilePurchase({
    productId,
    purchaseData,
  })
}

export async function restoreMobilePurchases() {
  if (!isMobileAppRuntime()) {
    throw new Error('Restauração de compras disponível apenas no app mobile')
  }

  const restoreData = await window.confiaStoreKit!.restorePurchases()

  const response = await fetch('/api/mobile/validate-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restoreData,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Falha ao restaurar compras')
  }

  return data
}
