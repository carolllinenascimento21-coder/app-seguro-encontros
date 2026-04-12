import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import twilio from 'twilio'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from '@/lib/env'
import {
  ALERT_COOLDOWN_MS,
  buildEmergencyLog,
  computeSmsTargets,
  MAX_CONTACTS_PER_ALERT,
  sanitizeContactsForAlert,
} from '@/lib/emergency-alert'

type EmergencyContactRow = {
  nome?: string | null
  telefone: string | null
  push_token?: string | null
  push_platform?: 'android' | 'ios' | null
}

type AlertLogContext = {
  requestId: string
  userId?: string
  contactsCount?: number
  validContactsCount?: number
  sendAttempts?: number
  [key: string]: unknown
}

const TWILIO_SEND_TIMEOUT_MS = 8000
const REQUEST_TIMEOUT_MS = 8000

const isFlagEnabled = (flagName: string, defaultValue = true): boolean => {
  const raw = process.env[flagName]
  if (!raw) {
    return defaultValue
  }

  return !['false', '0', 'off'].includes(raw.trim().toLowerCase())
}

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) {
    return '***'
  }

  return `${phone.slice(0, 3)}***${phone.slice(-2)}`
}

const logInfo = (event: string, context: AlertLogContext) => {
  console.log('[alerta-emergencia]', JSON.stringify({ level: 'info', event, ...context }))
}

const logError = (event: string, context: AlertLogContext) => {
  console.error('[alerta-emergencia]', JSON.stringify({ level: 'error', event, ...context }))
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutRef: NodeJS.Timeout | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutRef = setTimeout(() => {
      reject(new Error(`Timeout ao executar: ${label}`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutRef) {
      clearTimeout(timeoutRef)
    }
  }
}

const toE164Zapi = (e164Phone: string) => e164Phone.replace(/\D/g, '')

async function sendPushViaFcm(params: {
  contacts: Array<{ nome?: string | null; telefoneE164: string; push_token?: string | null; push_platform?: 'android' | 'ios' | null }>
  message: string
  locationUrl: string
  requestId: string
  userId: string
}) {
  if (!isFlagEnabled('ENABLE_PUSH')) {
    return { attempted: 0, success: 0, failed: 0, channelUsed: false, reason: 'push_disabled_by_flag' }
  }

  const fcmServerKey = process.env.FCM_SERVER_KEY
  if (!fcmServerKey) {
    return { attempted: 0, success: 0, failed: 0, channelUsed: false, reason: 'fcm_not_configured' }
  }

  const tokenContacts = params.contacts.filter((contact) => contact.push_token)
  if (tokenContacts.length === 0) {
    return { attempted: 0, success: 0, failed: 0, channelUsed: false, reason: 'no_push_tokens' }
  }

  let success = 0
  let failed = 0

  for (const contact of tokenContacts) {
    const payload = {
      to: contact.push_token,
      priority: 'high',
      notification: {
        title: '🚨 Alerta de emergência',
        body: params.message,
      },
      data: {
        emergency: 'true',
        location_url: params.locationUrl,
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
    }

    try {
      const response = await withTimeout(
        fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${fcmServerKey}`,
          },
          body: JSON.stringify(payload),
        }),
        REQUEST_TIMEOUT_MS,
        'fcm_send'
      )

      if (!response.ok) {
        failed += 1
        logError('push_send_error', {
          requestId: params.requestId,
          userId: params.userId,
          toMasked: maskPhone(contact.telefoneE164),
          status: response.status,
        })
        continue
      }

      success += 1
    } catch (error) {
      failed += 1
      logError('push_send_exception', {
        requestId: params.requestId,
        userId: params.userId,
        toMasked: maskPhone(contact.telefoneE164),
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

  return {
    attempted: tokenContacts.length,
    success,
    failed,
    channelUsed: tokenContacts.length > 0,
    reason: success > 0 ? 'sent' : 'failed',
  }
}

async function sendWhatsAppViaZApi(params: {
  contacts: Array<{ nome?: string | null; telefoneE164: string }>
  message: string
  requestId: string
  userId: string
}) {
  if (!isFlagEnabled('ENABLE_WHATSAPP')) {
    return {
      configured: false,
      attempted: 0,
      success: 0,
      failed: 0,
      sentTo: new Set<string>(),
      reason: 'whatsapp_disabled_by_flag',
    }
  }

  const baseUrl = process.env.ZAPI_BASE_URL
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const instanceToken = process.env.ZAPI_INSTANCE_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!baseUrl || !instanceId || !instanceToken) {
    return {
      configured: false,
      attempted: 0,
      success: 0,
      failed: 0,
      sentTo: new Set<string>(),
      reason: 'zapi_not_configured',
    }
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/instances/${instanceId}/token/${instanceToken}/send-text`

  const sentTo = new Set<string>()
  let success = 0
  let failed = 0

  for (const contact of params.contacts) {
    try {
      const response = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(clientToken ? { 'Client-Token': clientToken } : {}),
          },
          body: JSON.stringify({
            phone: toE164Zapi(contact.telefoneE164),
            message: params.message,
          }),
        }),
        REQUEST_TIMEOUT_MS,
        'zapi_send'
      )

      if (!response.ok) {
        failed += 1
        logError('whatsapp_send_error', {
          requestId: params.requestId,
          userId: params.userId,
          status: response.status,
          toMasked: maskPhone(contact.telefoneE164),
        })
        continue
      }

      sentTo.add(contact.telefoneE164)
      success += 1
    } catch (error) {
      failed += 1
      logError('whatsapp_send_exception', {
        requestId: params.requestId,
        userId: params.userId,
        toMasked: maskPhone(contact.telefoneE164),
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

  return {
    configured: true,
    attempted: params.contacts.length,
    success,
    failed,
    sentTo,
    reason: success > 0 ? 'sent' : 'failed',
  }
}

async function sendSmsViaTwilio(params: {
  contacts: Array<{ telefoneE164: string; telefoneOriginal: string }>
  message: string
  requestId: string
  userId: string
}) {
  if (!isFlagEnabled('ENABLE_SMS')) {
    return { attempted: 0, success: 0, failed: 0, reason: 'sms_disabled_by_flag' }
  }

  const twilioAccount = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (!twilioAccount || !twilioToken || !twilioPhone) {
    return { attempted: 0, success: 0, failed: 0, reason: 'twilio_not_configured' }
  }

  const twilioClient = twilio(twilioAccount, twilioToken)

  let success = 0
  let failed = 0

  for (const contact of params.contacts) {
    try {
      await withTimeout(
        twilioClient.messages.create({
          body: params.message,
          from: twilioPhone,
          to: contact.telefoneE164,
        }),
        TWILIO_SEND_TIMEOUT_MS,
        `twilio_send_${contact.telefoneE164}`
      )

      success += 1
    } catch (error) {
      failed += 1
      const twilioError = error as { message?: string; code?: number }
      logError('twilio_send_error', {
        requestId: params.requestId,
        userId: params.userId,
        toMasked: maskPhone(contact.telefoneE164),
        message: twilioError?.message,
        code: twilioError?.code,
      })
    }
  }

  return {
    attempted: params.contacts.length,
    success,
    failed,
    reason: success > 0 ? 'sent' : 'failed',
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    let payload: { latitude?: unknown; longitude?: unknown }

    try {
      payload = await req.json()
    } catch (jsonError) {
      logError('invalid_json', { requestId, jsonError: jsonError instanceof Error ? jsonError.message : 'unknown' })
      return NextResponse.json(
        { error: 'Payload inválido', requestId },
        { status: 400 }
      )
    }

    const { latitude, longitude } = payload

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Localização inválida', requestId },
        { status: 400 }
      )
    }

    let supabasePublicEnv
    let supabaseServiceEnv

    try {
      supabasePublicEnv = getSupabasePublicEnv('api/alerta-emergencia')
      supabaseServiceEnv = getSupabaseServiceEnv('api/alerta-emergencia')
    } catch (error) {
      const envError = getMissingSupabaseEnvDetails(error)
      if (envError) {
        logError('supabase_env_error', {
          requestId,
          message: envError.message,
        })
        return NextResponse.json({ error: envError.message, requestId }, { status: envError.status })
      }
      throw error
    }

    if (!supabasePublicEnv || !supabaseServiceEnv) {
      return NextResponse.json(
        { error: 'Supabase não configurado', requestId },
        { status: 503 }
      )
    }

    const cookieStore = await cookies()

    const supabaseAuth = createServerClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
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

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError) {
      logError('auth_validation_error', {
        requestId,
        code: authError.code,
        message: authError.message,
      })
      return NextResponse.json(
        { error: 'Erro ao validar autenticação', requestId },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Usuária não autenticada', requestId },
        { status: 401 }
      )
    }

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nome,last_alert_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logError('profile_fetch_error', {
        requestId,
        userId: user.id,
        code: profileError.code,
        message: profileError.message,
      })

      return NextResponse.json(
        { error: 'Erro ao validar perfil', requestId },
        { status: 500 }
      )
    }

    const now = Date.now()
    const lastAlertTs = profile?.last_alert_at ? new Date(profile.last_alert_at).getTime() : null
    if (lastAlertTs && now - lastAlertTs < ALERT_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((ALERT_COOLDOWN_MS - (now - lastAlertTs)) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${waitSeconds}s antes de enviar um novo alerta.`, requestId },
        { status: 429 }
      )
    }

    let contactsQuery = await supabaseAdmin
      .from('emergency_contacts')
      .select('nome,telefone,push_token,push_platform')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('created_at', { ascending: true })

    if (contactsQuery.error && contactsQuery.error.code === '42703') {
      contactsQuery = await supabaseAdmin
        .from('emergency_contacts')
        .select('nome,telefone,push_token,push_platform')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
    }

    const { data: contacts, error: contatosError } = contactsQuery

    if (contatosError) {
      logError('contacts_fetch_error', {
        requestId,
        userId: user.id,
        code: contatosError.code,
        message: contatosError.message,
      })
      return NextResponse.json(
        { error: 'Erro ao buscar contatos de emergência', requestId },
        { status: 500 }
      )
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato de emergência ativo', requestId },
        { status: 400 }
      )
    }

    const validContacts = sanitizeContactsForAlert(contacts as EmergencyContactRow[])

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum telefone válido no formato E.164', requestId },
        { status: 400 }
      )
    }

    const messageName = profile?.nome || 'Uma usuária'
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`
    const emergencyMessage = `🚨 EMERGÊNCIA: ${messageName} pode estar em risco. Contate imediatamente.\n📍 ${locationUrl}`

    const pushResult = await sendPushViaFcm({
      contacts: validContacts as Array<{ nome?: string | null; telefoneE164: string; push_token?: string | null; push_platform?: 'android' | 'ios' | null }>,
      message: emergencyMessage,
      locationUrl,
      requestId,
      userId: user.id,
    })

    const whatsappResult = await sendWhatsAppViaZApi({
      contacts: validContacts as Array<{ nome?: string | null; telefoneE164: string }>,
      message: emergencyMessage,
      requestId,
      userId: user.id,
    })

    const smsTargets = computeSmsTargets({
      contacts: validContacts as Array<{ telefoneE164: string; telefoneOriginal: string }>,
      whatsappConfigured: whatsappResult.configured,
      whatsappSentTo: whatsappResult.sentTo,
    })

    const smsResult = await sendSmsViaTwilio({
      contacts: smsTargets,
      message: emergencyMessage,
      requestId,
      userId: user.id,
    })

    const channelsUsed = [
      ...(pushResult.channelUsed ? (['push'] as const) : []),
      ...(whatsappResult.attempted > 0 ? (['whatsapp'] as const) : []),
      ...(smsResult.attempted > 0 ? (['sms'] as const) : []),
    ]

    const totalSuccess = pushResult.success + whatsappResult.success + smsResult.success
    const status = totalSuccess > 0 ? 'success' : 'fail'

    await supabaseAdmin
      .from('profiles')
      .update({ last_alert_at: new Date().toISOString() })
      .eq('id', user.id)

    await supabaseAdmin.from('emergency_logs').insert(
      buildEmergencyLog({
        userId: user.id,
        contactsCount: Math.min(validContacts.length, MAX_CONTACTS_PER_ALERT),
        channelsUsed: [...channelsUsed],
        status,
      })
    )

    logInfo('send_summary', {
      requestId,
      userId: user.id,
      contactsCount: contacts.length,
      validContactsCount: validContacts.length,
      sendAttempts: validContacts.length,
      push: pushResult,
      whatsapp: {
        attempted: whatsappResult.attempted,
        success: whatsappResult.success,
        failed: whatsappResult.failed,
        reason: whatsappResult.reason,
      },
      sms: smsResult,
      status,
    })

    if (status === 'fail') {
      return NextResponse.json(
        {
          error: 'Não foi possível enviar por nenhum canal. Tente novamente.',
          requestId,
          summary: {
            totalContatos: contacts.length,
            validos: validContacts.length,
            enviados: 0,
            falhas: validContacts.length,
          },
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      requestId,
      summary: {
        totalContatos: contacts.length,
        validos: validContacts.length,
        enviados: totalSuccess,
        falhas: Math.max(validContacts.length - totalSuccess, 0),
        channelsUsed,
      },
    })
  } catch (error) {
    const normalizedError = error as { message?: string; stack?: string }
    logError('internal_error', {
      requestId,
      message: normalizedError?.message,
      stack: normalizedError?.stack,
    })

    return NextResponse.json(
      { error: 'Erro interno ao enviar alerta', requestId },
      { status: 500 }
    )
  }
}
