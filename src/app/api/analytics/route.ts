import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Eventos permitidos (defensivo)
 * Evita lixo no analytics
 */
const ALLOWED_EVENTS = [
  'search_performed',
  'free_limit_reached',
  'view_result_summary',
  'click_view_details',
  'redirect_to_plans',
  'plan_viewed',
  'checkout_started',
  'subscription_success',
] as const

type AllowedEvent = (typeof ALLOWED_EVENTS)[number]

export async function POST(req: Request) {
  /* ────────────────────────────────────────────────
   * 1️⃣ Supabase público (env)
   * ──────────────────────────────────────────────── */
  try {
    // só valida env; não cria client aqui
    // evita erro silencioso em prod
    getMissingSupabaseEnvDetails(null)
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
  }

  /* ────────────────────────────────────────────────
   * 2️⃣ Autenticação
   * ──────────────────────────────────────────────── */
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // analytics nunca bloqueia UX
    return NextResponse.json({ received: true })
  }

  /* ────────────────────────────────────────────────
   * 3️⃣ Payload
   * ──────────────────────────────────────────────── */
  let body: {
    event?: string
    metadata?: Record<string, any>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ received: true })
  }

  const eventName = body.event as AllowedEvent | undefined

  if (!eventName || !ALLOWED_EVENTS.includes(eventName)) {
    // ignora evento inválido
    return NextResponse.json({ received: true })
  }

  /* ────────────────────────────────────────────────
   * 4️⃣ Supabase Admin
   * ──────────────────────────────────────────────── */
  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return NextResponse.json({ received: true })
    }
    throw error
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ received: true })
  }

  /* ────────────────────────────────────────────────
   * 5️⃣ Insert analytics
   * ──────────────────────────────────────────────── */
  await supabaseAdmin.from('analytics_events').insert({
    user_id: user.id,
    event_name: eventName,
    metadata: body.metadata ?? {},
  })

  /* ────────────────────────────────────────────────
   * 6️⃣ Retorno neutro
   * ──────────────────────────────────────────────── */
  return NextResponse.json({ received: true })
}
