import { NextResponse } from 'next/server'
import { ZodError, z } from 'zod'

import {
  activateAppleEntitlementFallback,
  isAppleActivationError,
} from '@/lib/apple-subscriptions/service'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const bodySchema = z.object({
  productId: z.string().min(3),
  environment: z.enum(['sandbox', 'production']).optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const parsed = bodySchema.parse(await req.json())

    const subscription = await activateAppleEntitlementFallback({
      userId: user.id,
      productId: parsed.productId,
      environment: parsed.environment,
    })

    return NextResponse.json({ ok: true, subscription }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0]?.message ?? 'invalid_request_body' },
        { status: 400 }
      )
    }

    if (isAppleActivationError(error)) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }

    return NextResponse.json({ ok: false, error: 'internal_server_error' }, { status: 500 })
  }
}
