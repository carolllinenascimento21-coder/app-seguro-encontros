export const FREE_REPUTATION_QUERY_LIMIT = 3

export type ReputationAccessProfile = {
  plan?: string | null
  has_active_plan?: boolean | null
  current_plan_id?: string | null
  subscription_status?: string | null
  free_queries_used?: number | null
}

export function hasPaidReputationAccess(profile: ReputationAccessProfile | null | undefined) {
  if (!profile) return false

  if (profile.has_active_plan === true) return true

  const subscriptionStatus = profile.subscription_status?.toLowerCase()

  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return true
  }

  const currentPlanId = profile.current_plan_id?.toLowerCase()
  if (currentPlanId) return currentPlanId !== 'free'

  const legacyPlan = profile.plan?.toLowerCase()
  return Boolean(legacyPlan && legacyPlan !== 'free')
}

export function getFreeReputationQueriesUsed(profile: ReputationAccessProfile | null | undefined) {
  return Math.max(0, Number(profile?.free_queries_used ?? 0))
}

export function canUseFreeReputationQuery(profile: ReputationAccessProfile | null | undefined) {
  return getFreeReputationQueriesUsed(profile) < FREE_REPUTATION_QUERY_LIMIT
}
