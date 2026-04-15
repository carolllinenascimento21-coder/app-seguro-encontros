export {}

declare global {
  type ConfiaStoreKitPurchase = {
    productId?: string
    transactionId?: string
    originalTransactionId?: string
    purchaseDate?: string
    expirationDate?: string | null
    environment?: 'sandbox' | 'production' | string
    appAccountToken?: string | null
    signedTransactionInfo?: string
  }

  type ConfiaStoreKitEntitlement = {
    productId?: string
    isActive?: boolean
    expiresDate?: string | null
    expirationDate?: string | null
  }

  interface Window {
    confiaStoreKit?: {
      getProducts?: () => Promise<unknown>
      purchase: (productId: string) => Promise<ConfiaStoreKitPurchase>
      restorePurchases?: () => Promise<unknown>
      restore?: () => Promise<unknown>
      getEntitlements?: () => Promise<unknown>
    }
    __confiaStoreKitState?: unknown
    __confiaSyncAppleEntitlements?: () => Promise<unknown>
  }
}
