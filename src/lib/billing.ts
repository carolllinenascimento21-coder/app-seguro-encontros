export const FREE_PLAN = 'free'

export type SubscriptionPlanId = 'premium_mensal' | 'premium_anual'
export type CreditPackId = 'credits_3' | 'credits_10' | 'credits_25'

export const subscriptionPriceEnvCandidates = {
  premium_monthly: [
    'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_PREMIUM_MONTHLY',
    'STRIPE_PRICE_PREMIUM_MENSAL',
  ],
  premium_yearly: [
    'STRIPE_PRICE_YEARLY',
    'STRIPE_PRICE_PREMIUM_YEARLY',
    'STRIPE_PRICE_PREMIUM_ANUAL',
  ],
} as const

export type SubscriptionCheckoutPlanId = keyof typeof subscriptionPriceEnvCandidates
export type ProfilePlanId = 'free' | SubscriptionPlanId

export function resolveSubscriptionPriceId(planId: SubscriptionCheckoutPlanId) {
  const candidates = subscriptionPriceEnvCandidates[planId]
  for (const envName of candidates) {
    const value = process.env[envName]
    if (value) return value
  }
  return null
}

export function resolveSubscriptionPlanFromPriceId(priceId: string) {
  for (const planId of Object.keys(subscriptionPriceEnvCandidates) as SubscriptionCheckoutPlanId[]) {
    if (resolveSubscriptionPriceId(planId) === priceId) {
      return planId
    }
  }

  return null
}

export function toProfilePlanId(planId: SubscriptionCheckoutPlanId): SubscriptionPlanId {
  if (planId === 'premium_monthly') return 'premium_mensal'
  return 'premium_anual'
}

export const subscriptionPriceEnvByPlan: Record<SubscriptionPlanId, string> = {
  premium_mensal: 'STRIPE_PRICE_PREMIUM_MENSAL',
  premium_anual: 'STRIPE_PRICE_PREMIUM_ANUAL',
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
