import { NextResponse } from 'next/server'
import { z } from 'zod'

import { validateGooglePurchaseAndPersist } from '@/lib/billing/service'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const bodySchema = z.object({
  userId: z.string().uuid().optional(),
  platform: z.literal('google'),
  productId: z.string().min(3),
  purchaseToken: z.string().min(8),
  orderId: z.string().optional(),
  packageName: z.string().min(3),
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const parsed = bodySchema.parse(await req.json())
    if (parsed.userId && parsed.userId !== user.id) {
      return NextResponse.json({ ok: false, error: 'user_mismatch' }, { status: 403 })
    }

    const result = await validateGooglePurchaseAndPersist({
      userId: user.id,
      productId: parsed.productId,
      purchaseToken: parsed.purchaseToken,
      packageName: parsed.packageName,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'google_validation_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
