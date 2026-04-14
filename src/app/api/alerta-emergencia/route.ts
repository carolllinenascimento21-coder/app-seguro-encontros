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

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  let userId: string | null = null

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

    const supabaseAdmin = createServerClient(supabaseServiceEnv.url, supabaseServiceEnv.serviceRoleKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })

    let requestBody: AlertRequestBody = {}
    try {
      requestBody = (await request.json()) as AlertRequestBody
    } catch {
      return NextResponse.json({ error: 'Payload inválido', requestId }, { status: 400 })
    }

    if (requestBody.confirmation !== true) {
      return NextResponse.json({ error: 'Confirmação obrigatória', requestId }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    userId = user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,last_alert_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: 'Erro interno', requestId }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado', requestId }, { status: 404 })
    }

    if (isWithinCooldown(profile.last_alert_at)) {
      return NextResponse.json(
        { error: 'Cooldown ativo. Tente novamente em até 2 minutos.', status: 'cooldown', requestId },
        { status: 429 }
      )
    }

    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('emergency_contacts')
      .select('id,nome,telefone,push_token,push_platform')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(3)

    if (contactsError) {
      return NextResponse.json({ error: 'Erro interno', requestId }, { status: 500 })
    }

    const sanitizedContacts = sanitizeContactsForAlert(contacts ?? [])

    if (sanitizedContacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato válido configurado para alerta.', requestId },
        { status: 400 }
      )
    }

    const dispatchResult = await dispatchEmergencyAlert(sanitizedContacts)

    console.log('[EMERGENCY_ALERT]', {
      user_id: user.id,
      push: dispatchResult.push,
      whatsapp: dispatchResult.whatsapp,
      sms: dispatchResult.sms,
    })

    const contatosMascarados = sanitizedContacts.map((contact) => maskPhone(contact.telefoneOriginal))

    await supabaseAdmin.from('emergency_logs').insert(
      buildEmergencyLog({
        userId: user.id,
        contactsSent: contatosMascarados,
        channelsUsed: dispatchResult.channels_used,
        status: dispatchResult.overall_status,
        error: dispatchResult.error,
      })
    )

    if (dispatchResult.overall_status !== 'failed') {
      await supabaseAdmin
        .from('profiles')
        .update({ last_alert_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    if (dispatchResult.overall_status === 'failed') {
      return NextResponse.json(
        {
          error: 'Não foi possível enviar o alerta em nenhum canal.',
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
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    try {
      const supabaseServiceEnv = getSupabaseServiceEnv('api/alerta-emergencia')

      if (supabaseServiceEnv) {
        const supabaseAdmin = createServerClient(
          supabaseServiceEnv.url,
          supabaseServiceEnv.serviceRoleKey,
          {
            cookies: {
              getAll: () => [],
              setAll: () => {},
            },
          }
        )

        await supabaseAdmin.from('emergency_logs').insert({
          user_id: userId,
          status: 'failed',
          erro: errorMessage,
          canais_utilizados: [],
          contatos_enviados: [],
        })
      }
    } catch {
      // noop
    }

    return NextResponse.json({ error: 'Erro interno', requestId }, { status: 500 })
  }
}
