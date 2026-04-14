import { NextResponse } from 'next/server'
import { z } from 'zod'

import { processAppleNotification } from '@/lib/billing/service'

export const runtime = 'nodejs'

const schema = z.object({
  signedPayload: z.string().min(20),
})

export async function POST(req: Request) {
  try {
    const parsed = schema.parse(await req.json())
    await processAppleNotification({ signedPayload: parsed.signedPayload })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'apple_notification_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
