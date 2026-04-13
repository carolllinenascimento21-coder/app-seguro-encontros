import { NextResponse } from 'next/server'

import { reconcileStripeProfiles } from '@/lib/stripe/reconcileProfiles'
import { getStripeClient } from '@/lib/stripe'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const secret = process.env.INTERNAL_ADMIN_SECRET
  if (!secret) return false

  const headerSecret = request.headers.get('x-internal-admin-secret')
  return headerSecret === secret
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripe = getStripeClient()
  const supabase = getSupabaseAdminClient()

  if (!stripe || !supabase) {
    return NextResponse.json({ error: 'Stripe/Supabase indisponível' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const dryRun = Boolean(body?.dryRun)
  const onlyUserId = typeof body?.userId === 'string' && body.userId.trim() ? body.userId.trim() : undefined

  const result = await reconcileStripeProfiles({
    stripe,
    supabase,
    dryRun,
    onlyUserId,
    logger: console,
  })

  return NextResponse.json({ ok: true, ...result })
}
