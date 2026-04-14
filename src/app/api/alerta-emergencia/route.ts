import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from '@/lib/env'

const ALERT_COOLDOWN_MS = 120000

export async function POST() {
  const requestId = crypto.randomUUID()
  let user: { id: string } | null = null
  let supabaseAdmin: ReturnType<typeof createServerClient> | null = null

  try {
    let supabasePublicEnv
    let supabaseServiceEnv

    try {
      supabasePublicEnv = getSupabasePublicEnv('api/alerta-emergencia')
      supabaseServiceEnv = getSupabaseServiceEnv('api/alerta-emergencia')
    } catch (error) {
      const envError = getMissingSupabaseEnvDetails(error)
      if (envError) {
        return NextResponse.json({ error: envError.message, requestId }, { status: envError.status })
      }
      return NextResponse.json({ error: 'Erro interno', requestId }, { status: 500 })
    }

    if (!supabasePublicEnv || !supabaseServiceEnv) {
      return NextResponse.json({ error: 'Supabase não configurado', requestId }, { status: 503 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // noop
          }
        },
      },
    })

    supabaseAdmin = createServerClient(supabaseServiceEnv.url, supabaseServiceEnv.serviceRoleKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    user = { id: authUser.id }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('last_alert_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    if (
      profile?.last_alert_at &&
      Date.now() - new Date(profile.last_alert_at).getTime() < ALERT_COOLDOWN_MS
    ) {
      return NextResponse.json({ error: 'Cooldown ativo' }, { status: 429 })
    }

    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(3)

    if (contactsError) {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    if (!contacts || contacts.length === 0) {
      console.info('[alerta-emergencia] no active emergency contacts', { requestId, userId: user.id })
    }

    await supabaseAdmin.from('emergency_logs').insert({
      user_id: user.id,
      contatos_enviados: contacts ?? [],
      canais_utilizados: ['push'],
      status: 'success',
    })

    await supabaseAdmin
      .from('profiles')
      .update({ last_alert_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ success: true, requestId })
  } catch (err) {
    if (supabaseAdmin) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'

      try {
        await supabaseAdmin.from('emergency_logs').insert({
          user_id: user?.id,
          status: 'error',
          erro: errorMessage,
        })
      } catch {
        // noop
      }
    }

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
