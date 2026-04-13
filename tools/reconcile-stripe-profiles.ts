import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

import { reconcileStripeProfiles } from '../src/lib/stripe/reconcileProfiles'

const requiredEnv = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Missing required env: ${envName}`)
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function parseArgs(args: string[]) {
  let dryRun = false
  let onlyUserId: string | undefined

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true
    if (arg.startsWith('--user-id=')) onlyUserId = arg.slice('--user-id='.length)
  }

  return { dryRun, onlyUserId }
}

async function main() {
  const { dryRun, onlyUserId } = parseArgs(process.argv.slice(2))

  console.info('[reconcile] iniciando', { dryRun, onlyUserId: onlyUserId ?? null })

  const result = await reconcileStripeProfiles({
    stripe,
    supabase,
    dryRun,
    onlyUserId,
    logger: console,
  })

  console.info('[reconcile] concluído', result)
}

main().catch((error) => {
  console.error('[reconcile] erro fatal', error)
  process.exit(1)
})
