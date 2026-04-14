import { NextResponse } from 'next/server'
import { z } from 'zod'

import { validateApplePurchaseAndPersist } from '@/lib/billing/service'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const bodySchema = z.object({
  userId: z.string().uuid().optional(),
  productId: z.string().min(3),
  transactionId: z.string().optional(),
  originalTransactionId: z.string().optional(),
  appAccountToken: z.string().uuid().optional(),
  signedTransactionInfo: z.string().optional(),
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

    const result = await validateApplePurchaseAndPersist({
      userId: user.id,
      productId: parsed.productId,
      transactionId: parsed.transactionId,
      originalTransactionId: parsed.originalTransactionId,
      appAccountToken: parsed.appAccountToken,
      signedTransactionInfo: parsed.signedTransactionInfo,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'apple_validation_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
