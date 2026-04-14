import { isMobileAppRuntime, mapPlanToProduct, type CanonicalPlanId } from '@/lib/mobile-billing'

type StripeCheckoutFn = (planId: CanonicalPlanId) => Promise<void>

type AppleActivationPayload = {
  productId: string
  transactionId: string
  originalTransactionId: string
  purchaseDate: string
  expirationDate: string | null
  environment: 'sandbox' | 'production'
  appAccountToken: string | null
  signedTransactionInfo: string | null
}

type PurchasePlanResult = {
  ok: true
  subscription: Record<string, unknown> | null
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function resolveEnvironment(value: unknown): 'sandbox' | 'production' {
  return value === 'production' ? 'production' : 'sandbox'
}

function normalizeApplePayload(raw: unknown, fallbackProductId: string): AppleActivationPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Retorno do StoreKit inválido')
  }

  const purchase = raw as Record<string, unknown>
  const productId = typeof purchase.productId === 'string' ? purchase.productId : fallbackProductId
  const transactionId = String(
    purchase.transactionId ?? purchase.originalTransactionId ?? ''
  ).trim()
  const originalTransactionId = String(
    purchase.originalTransactionId ?? purchase.transactionId ?? ''
  ).trim()
  const purchaseDate = toIsoDate(purchase.purchaseDate) ?? new Date().toISOString()
  const expirationDate = toIsoDate(purchase.expirationDate)
  const appAccountToken =
    typeof purchase.appAccountToken === 'string' && purchase.appAccountToken.trim().length > 0
      ? purchase.appAccountToken
      : null
  const signedTransactionInfo =
    typeof purchase.signedTransactionInfo === 'string' ? purchase.signedTransactionInfo.trim() : null

  if (!productId) throw new Error('Compra Apple sem productId')
  if (!transactionId) throw new Error('Compra Apple sem transactionId')
  if (!originalTransactionId) throw new Error('Compra Apple sem originalTransactionId')
  return {
    productId,
    transactionId,
    originalTransactionId,
    purchaseDate,
    expirationDate,
    environment: resolveEnvironment(purchase.environment),
    appAccountToken,
    signedTransactionInfo,
  }
}

async function activateAppleSubscription(payload: AppleActivationPayload) {
  const usePhase1Activation = Boolean(payload.signedTransactionInfo)
  const endpoint = usePhase1Activation
    ? '/api/apple/activate-subscription'
    : '/api/billing/apple/validate'

  const requestBody = usePhase1Activation
    ? payload
    : {
        productId: payload.productId,
        transactionId: payload.transactionId,
        originalTransactionId: payload.originalTransactionId,
        appAccountToken: payload.appAccountToken ?? undefined,
      }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Falha ao validar compra mobile')
  }

  return data
}

function parseRestorePurchases(raw: unknown): Record<string, unknown>[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
  if (typeof raw !== 'object') return []

  const value = raw as Record<string, unknown>
  if (Array.isArray(value.purchases)) {
    return value.purchases.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
  }

  return [value]
}

async function syncActiveEntitlements() {
  if (!window.confiaStoreKit?.getEntitlements) return

  const entitlementsRaw = await window.confiaStoreKit.getEntitlements()
  const entries = Array.isArray(entitlementsRaw)
    ? entitlementsRaw
    : typeof entitlementsRaw === 'object' && entitlementsRaw && Array.isArray((entitlementsRaw as Record<string, unknown>).entitlements)
      ? ((entitlementsRaw as Record<string, unknown>).entitlements as unknown[])
      : []

  for (const item of entries) {
    if (!item || typeof item !== 'object') continue

    const entitlement = item as Record<string, unknown>
    const productId = typeof entitlement.productId === 'string' ? entitlement.productId : ''
    if (!productId) continue

    const isActive = entitlement.isActive !== false
    if (!isActive) continue
    if (
      typeof entitlement.transactionId !== 'string' &&
      typeof entitlement.originalTransactionId !== 'string'
    ) {
      continue
    }
    const normalized = normalizeApplePayload(
      {
        ...entitlement,
        productId,
      },
      productId
    )

    await activateAppleSubscription(normalized)
  }
}

export async function purchasePlan(
  planId: CanonicalPlanId,
  stripeCheckout: StripeCheckoutFn
): Promise<PurchasePlanResult | void> {
  if (!isMobileAppRuntime()) {
    await stripeCheckout(planId)
    return
  }

  const productId = mapPlanToProduct(planId)
  const purchaseData = await window.confiaStoreKit!.purchase(productId)
  const payload = normalizeApplePayload(purchaseData, productId)

  const result = await activateAppleSubscription(payload)
  await syncActiveEntitlements()

  return {
    ok: true,
    subscription: result?.subscription ?? null,
  }
}

export async function restoreMobilePurchases() {
  if (!isMobileAppRuntime()) {
    throw new Error('Restauração de compras disponível apenas no app mobile')
  }

  const restoreFn = window.confiaStoreKit!.restorePurchases ?? window.confiaStoreKit!.restore
  if (!restoreFn) {
    throw new Error('Bridge do StoreKit sem método de restore')
  }

  const restoreData = await restoreFn()
  const purchases = parseRestorePurchases(restoreData)

  if (purchases.length === 0) {
    throw new Error('Nenhuma compra elegível para restaurar')
  }

  const restored = [] as Array<Record<string, unknown>>
  for (const purchase of purchases) {
    const productId = typeof purchase.productId === 'string' ? purchase.productId : ''
    if (!productId) continue

    const payload = normalizeApplePayload(purchase, productId)
    const result = await activateAppleSubscription(payload)
    restored.push(result)
  }

  await syncActiveEntitlements()

  if (restored.length === 0) {
    throw new Error('Nenhuma assinatura ativa foi sincronizada')
  }

  return {
    ok: true,
    restored,
  }
}
