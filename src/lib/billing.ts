export const FREE_PLAN = 'free'

export type SubscriptionPlanId = 'premium_mensal' | 'premium_anual' | 'premium_plus'
export type CreditPackId = 'credits_3' | 'credits_10' | 'credits_25'

export const subscriptionPriceEnvByPlan: Record<SubscriptionPlanId, string> = {
  premium_mensal: 'STRIPE_PRICE_PREMIUM_MENSAL',
  premium_anual: 'STRIPE_PRICE_PREMIUM_ANUAL',
  premium_plus: 'STRIPE_PRICE_PREMIUM_PLUS',
}

export const creditPackEnvById: Record<CreditPackId, string> = {
  credits_3: 'STRIPE_PRICE_CREDITS_3',
  credits_10: 'STRIPE_PRICE_CREDITS_10',
  credits_25: 'STRIPE_PRICE_CREDITS_25',
}

export const creditPackAmounts: Record<CreditPackId, number> = {
  credits_3: 3,
  credits_10: 10,
  credits_25: 25,
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
