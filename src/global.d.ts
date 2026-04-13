export {}

declare global {
  interface Window {
    confiaStoreKit?: {
      purchase: (productId: string) => Promise<unknown>
      restorePurchases: () => Promise<unknown>
    }
  }
}
