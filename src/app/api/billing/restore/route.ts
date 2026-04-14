import { NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApplePurchaseAndPersist, validateGooglePurchaseAndPersist } from '@/lib/billing/service'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const schema = z.object({
  purchases: z
    .array(
      z.discriminatedUnion('platform', [
        z.object({
          platform: z.literal('apple'),
          productId: z.string(),
          transactionId: z.string().optional(),
          originalTransactionId: z.string().optional(),
          appAccountToken: z.string().optional(),
          signedTransactionInfo: z.string().optional(),
        }),
        z.object({
          platform: z.literal('google'),
          productId: z.string(),
          purchaseToken: z.string(),
          packageName: z.string(),
        }),
      ])
    )
    .min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const parsed = schema.parse(await req.json())

    const results = [] as Array<Record<string, unknown>>
    for (const purchase of parsed.purchases) {
      if (purchase.platform === 'apple') {
        const result = await validateApplePurchaseAndPersist({ userId: user.id, ...purchase })
        results.push(result)
      } else {
        const result = await validateGooglePurchaseAndPersist({ userId: user.id, ...purchase })
        results.push(result)
      }
    }

    return NextResponse.json({ ok: true, restored: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'restore_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
