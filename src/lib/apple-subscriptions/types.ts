export type AppleEnvironment = 'sandbox' | 'production'

export type AppleActivateSubscriptionRequest = {
  productId: string
  transactionId: string
  originalTransactionId: string
  purchaseDate: string
  expirationDate: string | null
  environment: AppleEnvironment
  appAccountToken: string | null
  signedTransactionInfo: string
}

export type ApplePlanId = 'premium_monthly' | 'premium_annual' | 'premium_plus'

export type AppleSubscriptionResponse = {
  provider: 'apple'
  plan: ApplePlanId
  status: 'active'
  productId: string
  transactionId: string
  originalTransactionId: string
  startsAt: string
  expiresAt: string | null
}
