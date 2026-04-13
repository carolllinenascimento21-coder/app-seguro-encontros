import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const requiredEnv = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Missing required env: ${envName}`)
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const planToProfilePlan = {
  premium_monthly: 'premium_mensal',
  premium_yearly: 'premium_anual',
}

function resolveSubscriptionPlanFromPriceId(priceId) {
  const candidates = [
    ['premium_monthly', [process.env.STRIPE_PRICE_MONTHLY, process.env.STRIPE_PRICE_PREMIUM_MONTHLY, process.env.STRIPE_PRICE_PREMIUM_MENSAL]],
    ['premium_yearly', [process.env.STRIPE_PRICE_YEARLY, process.env.STRIPE_PRICE_PREMIUM_YEARLY, process.env.STRIPE_PRICE_PREMIUM_ANUAL]],
  ]

  for (const [plan, ids] of candidates) {
    if (ids.filter(Boolean).includes(priceId)) {
      return plan
    }
  }

  return null
}

async function fixBrokenSubscriptions() {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .not('stripe_subscription_id', 'is', null)

  if (error) {
    throw error
  }

  for (const user of users ?? []) {
    const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id)
    if (sub.status !== 'active') continue

    const priceId = sub.items.data[0]?.price?.id
    if (!priceId) continue

    const plan = resolveSubscriptionPlanFromPriceId(priceId)
    const planId = plan ? planToProfilePlan[plan] : null

    const updatePayload = {
      subscription_status: 'active',
      has_active_plan: true,
    }
    if (planId) updatePayload.current_plan_id = planId

    const { error: updateError } = await supabase.from('profiles').update(updatePayload).eq('id', user.id)
    if (updateError) {
      console.error('FAILED:', user.email, updateError.message)
      continue
    }

    console.log('FIXED:', user.email)
  }
}

fixBrokenSubscriptions()
  .then(() => {
    console.log('Done.')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
