import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing'])

type ProfileRow = {
  id: string
  email: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_plan_id: string | null
  subscription_status: string | null
  has_active_plan: boolean | null
}

export type ReconcileStripeProfilesOptions = {
  stripe: Stripe
  supabase: SupabaseClient
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  onlyUserId?: string
  dryRun?: boolean
}

type PlanId = 'premium_monthly' | 'premium_yearly' | 'free'

const PRICE_ID_TO_PLAN = new Map<string, Exclude<PlanId, 'free'>>([
  ['price_1TLnik7IHHkQslacwjylAQQ6', 'premium_monthly'],
  ['price_1Ssre07IHHkQslacWeLkInUG', 'premium_monthly'],
  ['price_1TLnuq7IHHkQslacJkeB4at5', 'premium_yearly'],
  ['price_1St4jv7IHHkQslac8a8yKmJb', 'premium_yearly'],
])

function normalizePatch(input: {
  subscriptionStatus: string
  planId: PlanId
  hasActivePlan: boolean
  customerId: string | null
  subscriptionId: string | null
}) {
  return {
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    current_plan_id: input.planId,
    subscription_status: input.subscriptionStatus,
    has_active_plan: input.hasActivePlan,
  }
}

function buildDiff(profile: ProfileRow, patch: ReturnType<typeof normalizePatch>) {
  const changed: Record<string, unknown> = {}

  if (profile.stripe_customer_id !== patch.stripe_customer_id) {
    changed.stripe_customer_id = patch.stripe_customer_id
  }
  if (profile.stripe_subscription_id !== patch.stripe_subscription_id) {
    changed.stripe_subscription_id = patch.stripe_subscription_id
  }
  if ((profile.current_plan_id ?? 'free') !== patch.current_plan_id) {
    changed.current_plan_id = patch.current_plan_id
  }
  if ((profile.subscription_status ?? '') !== patch.subscription_status) {
    changed.subscription_status = patch.subscription_status
  }
  if (Boolean(profile.has_active_plan) !== patch.has_active_plan) {
    changed.has_active_plan = patch.has_active_plan
  }

  return changed
}

function pickCurrentPriceId(subscription: Stripe.Subscription | null) {
  if (!subscription) return null

  const firstItem = subscription.items.data[0]
  return firstItem?.price?.id ?? null
}

function derivePatchFromStripe(profile: ProfileRow, subscription: Stripe.Subscription | null) {
  if (!subscription) {
    return normalizePatch({
      subscriptionStatus: 'not_found',
      planId: 'free',
      hasActivePlan: false,
      customerId: profile.stripe_customer_id,
      subscriptionId: profile.stripe_subscription_id,
    })
  }

  const subscriptionStatus = subscription.status
  const customerId = subscription.customer?.toString() ?? profile.stripe_customer_id
  const subscriptionId = subscription.id
  const priceId = pickCurrentPriceId(subscription)
  const mappedPlan = priceId ? PRICE_ID_TO_PLAN.get(priceId) ?? null : null

  const isActive = ACTIVE_STATUSES.has(subscriptionStatus)

  if (isActive && mappedPlan) {
    return normalizePatch({
      subscriptionStatus,
      planId: mappedPlan,
      hasActivePlan: true,
      customerId,
      subscriptionId,
    })
  }

  return normalizePatch({
    subscriptionStatus,
    planId: 'free',
    hasActivePlan: false,
    customerId,
    subscriptionId,
  })
}

async function getSubscriptionById(
  stripe: Stripe,
  subscriptionId: string,
  logger: Pick<Console, 'warn'>
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    logger.warn(`[reconcile] subscription_id inválido/inexistente: ${subscriptionId}`)
    return null
  }
}

async function getSubscriptionByCustomer(
  stripe: Stripe,
  customerId: string,
  logger: Pick<Console, 'warn'>
): Promise<Stripe.Subscription | null> {
  try {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    })

    if (!list.data.length) return null

    const sorted = [...list.data].sort((a, b) => {
      const aPriority = ACTIVE_STATUSES.has(a.status) ? 0 : 1
      const bPriority = ACTIVE_STATUSES.has(b.status) ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return b.created - a.created
    })

    return sorted[0] ?? null
  } catch (error) {
    logger.warn(`[reconcile] erro ao listar assinaturas do customer ${customerId}`)
    return null
  }
}

async function resolveSubscription(stripe: Stripe, profile: ProfileRow, logger: Pick<Console, 'warn'>) {
  if (profile.stripe_subscription_id) {
    const byId = await getSubscriptionById(stripe, profile.stripe_subscription_id, logger)
    if (byId) return byId
  }

  if (profile.stripe_customer_id) {
    const byCustomer = await getSubscriptionByCustomer(stripe, profile.stripe_customer_id, logger)
    if (byCustomer) return byCustomer
  }

  return null
}

export async function reconcileStripeProfiles({
  stripe,
  supabase,
  logger = console,
  onlyUserId,
  dryRun = false,
}: ReconcileStripeProfilesOptions) {
  let query = supabase.from('profiles').select(
    'id, email, stripe_customer_id, stripe_subscription_id, current_plan_id, subscription_status, has_active_plan'
  )

  if (onlyUserId) {
    query = query.eq('id', onlyUserId)
  }

  const { data: profiles, error } = await query

  if (error) {
    throw new Error(`Falha ao carregar profiles: ${error.message}`)
  }

  let updated = 0
  let unchanged = 0
  let failed = 0

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    try {
      const subscription = await resolveSubscription(stripe, profile, logger)
      const nextPatch = derivePatchFromStripe(profile, subscription)
      const changes = buildDiff(profile, nextPatch)

      const summary = {
        userId: profile.id,
        email: profile.email,
        resolvedSubscriptionId: nextPatch.stripe_subscription_id,
        resolvedCustomerId: nextPatch.stripe_customer_id,
        plan: nextPatch.current_plan_id,
        status: nextPatch.subscription_status,
        hasActivePlan: nextPatch.has_active_plan,
        changedFields: Object.keys(changes),
      }

      if (!Object.keys(changes).length) {
        unchanged += 1
        logger.info('[reconcile] sem alterações', summary)
        continue
      }

      if (dryRun) {
        unchanged += 1
        logger.info('[reconcile] dry-run (não aplicado)', summary)
        continue
      }

      const { error: updateError } = await supabase.from('profiles').update(changes).eq('id', profile.id)
      if (updateError) {
        failed += 1
        logger.error('[reconcile] erro ao atualizar profile', {
          ...summary,
          error: updateError.message,
        })
        continue
      }

      updated += 1
      logger.info('[reconcile] profile reconciliado', summary)
    } catch (error) {
      failed += 1
      logger.error('[reconcile] falha inesperada', {
        userId: profile.id,
        email: profile.email,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    total: profiles?.length ?? 0,
    updated,
    unchanged,
    failed,
    dryRun,
    onlyUserId: onlyUserId ?? null,
  }
}
