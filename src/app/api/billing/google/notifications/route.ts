import { NextResponse } from 'next/server'
import { z } from 'zod'

import { processGoogleNotification } from '@/lib/billing/service'

export const runtime = 'nodejs'

const schema = z.object({
  message: z.object({
    data: z.string().min(8),
  }),
})

export async function POST(req: Request) {
  try {
    const parsed = schema.parse(await req.json())
    await processGoogleNotification({
      messageDataBase64: parsed.message.data,
      fallbackUserId: process.env.GOOGLE_RTDM_FALLBACK_USER_ID,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'google_notification_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
