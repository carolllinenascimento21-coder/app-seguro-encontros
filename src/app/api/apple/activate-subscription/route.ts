import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import {
  activateAppleSubscription,
  isAppleActivationError,
} from '@/lib/apple-subscriptions/service'
import { parseAppleActivationBody } from '@/lib/apple-subscriptions/validators'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { ok: false, error: 'content_type_must_be_application_json' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = parseAppleActivationBody(await req.json())

    const subscription = await activateAppleSubscription({
      userId: user.id,
      payload: body,
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
