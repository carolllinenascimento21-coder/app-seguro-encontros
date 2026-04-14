import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  buildEmergencyLog,
  dispatchEmergencyAlert,
  isWithinCooldown,
  maskPhone,
  sanitizeContactsForAlert,
} from '@/lib/emergency-alert'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from '@/lib/env'

type AlertRequestBody = {
  latitude?: number
  longitude?: number
  confirmation?: boolean
}

// FEATURE FLAGS SAFE
const ENABLE_PUSH = process.env.ENABLE_PUSH === 'true'
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP === 'true'
const ENABLE_SMS = process.env.ENABLE_SMS === 'true'

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  let userId: string | null = null

  try {
    // =========================
    // ENV VALIDATION
    // =========================
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

    // =========================
    // CLIENTS
    // =========================
    const cookieStore = await cookies()

    const supabase = createServerClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const supabaseAdmin = createServerClient(supabaseServiceEnv.url, supabaseServiceEnv.serviceRoleKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })

    // =========================
    // BODY
    // =========================
    let requestBody: AlertRequestBody = {}
    try {
      requestBody = (await request.json()) as AlertRequestBody
    } catch {
      return NextResponse.json({ error: 'Payload inválido', requestId }, { status: 400 })
    }

    if (requestBody.confirmation !== true) {
      return NextResponse.json({ error: 'Confirmação obrigatória', requestId }, { status: 400 })
    }

    // =========================
    // AUTH
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado', requestId }, { status: 401 })
    }

    userId = user.id

    // =========================
    // PROFILE (SAFE CREATE)
    // =========================
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,last_alert_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('PROFILE ERROR:', profileError)
      return NextResponse.json({ error: 'Erro ao buscar perfil', requestId }, { status: 500 })
    }

    // 🔥 CORREÇÃO CRÍTICA
    if (!profile) {
      const { error: insertError } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        last_alert_at: null,
      })

      if (insertError) {
        console.error('PROFILE CREATE ERROR:', insertError)
        return NextResponse.json({ error: 'Erro ao criar perfil', requestId }, { status: 500 })
      }

      profile = { id: user.id, last_alert_at: null }
    }

    // =========================
    // COOLDOWN
    // =========================
    if (isWithinCooldown(profile.last_alert_at)) {
      return NextResponse.json(
        {
          error: 'Cooldown ativo. Aguarde 2 minutos.',
          status: 'cooldown',
          requestId,
        },
        { status: 429 }
      )
    }

    // =========================
    // CONTACTS
    // =========================
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('emergency_contacts')
      .select('id,nome,telefone,push_token,push_platform')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(3)

    if (contactsError) {
      console.error('CONTACT ERROR:', contactsError)
      return NextResponse.json({ error: 'Erro ao buscar contatos', requestId }, { status: 500 })
    }

    const sanitizedContacts = sanitizeContactsForAlert(contacts ?? [])

    if (sanitizedContacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato válido configurado.', requestId },
        { status: 400 }
      )
    }

    // =========================
    // DISPATCH (SAFE FLAGS)
    // =========================
    const dispatchResult = await dispatchEmergencyAlert(sanitizedContacts, {
      enablePush: ENABLE_PUSH,
      enableWhatsApp: ENABLE_WHATSAPP,
      enableSMS: ENABLE_SMS,
    })

    console.log('[EMERGENCY_ALERT]', {
      user_id: user.id,
      push: dispatchResult.push,
      whatsapp: dispatchResult.whatsapp,
      sms: dispatchResult.sms,
    })

    // =========================
    // LOG
    // =========================
    const contatosMascarados = sanitizedContacts.map((c) =>
      maskPhone(c.telefoneOriginal)
    )

    await supabaseAdmin.from('emergency_logs').insert(
      buildEmergencyLog({
        userId: user.id,
        contactsSent: contatosMascarados,
        channelsUsed: dispatchResult.channels_used,
        status: dispatchResult.overall_status,
        error: dispatchResult.error,
      })
    )

    // =========================
    // UPDATE COOLDOWN
    // =========================
    if (dispatchResult.overall_status !== 'failed') {
      await supabaseAdmin
        .from('profiles')
        .update({ last_alert_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // =========================
    // RESPONSE
    // =========================
    if (dispatchResult.overall_status === 'failed') {
      return NextResponse.json(
        {
          error: 'Falha ao enviar alerta',
          status: 'error',
          result: dispatchResult,
          requestId,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        status: dispatchResult.overall_status,
        result: dispatchResult,
        requestId,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    console.error('FATAL ERROR:', errorMessage)

    try {
      const supabaseServiceEnv = getSupabaseServiceEnv('api/alerta-emergencia')

      if (supabaseServiceEnv) {
        const supabaseAdmin = createServerClient(
          supabaseServiceEnv.url,
          supabaseServiceEnv.serviceRoleKey,
          { cookies: { getAll: () => [], setAll: () => {} } }
        )

        await supabaseAdmin.from('emergency_logs').insert({
          user_id: userId,
          status: 'failed',
          erro: errorMessage,
          canais_utilizados: [],
          contatos_enviados: [],
        })
      }
    } catch {}

    return NextResponse.json(
      { error: 'Erro interno', requestId },
      { status: 500 }
    )
  }
}
