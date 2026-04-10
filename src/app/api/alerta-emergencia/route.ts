import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import twilio from 'twilio'
import {
  getMissingSupabaseEnvDetails,
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from '@/lib/env'

type EmergencyContactRow = {
  telefone: string | null
}

type AlertLogContext = {
  requestId: string
  userId?: string
  contactsCount?: number
  validContactsCount?: number
  sendAttempts?: number
  [key: string]: unknown
}

const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/
const TWILIO_SEND_TIMEOUT_MS = 8000

const normalizePhoneToE164 = (rawPhone: string): string | null => {
  const digitsOnly = rawPhone.replace(/\D/g, '')

  if (!digitsOnly) {
    return null
  }

  if (rawPhone.trim().startsWith('+')) {
    const normalizedWithPlus = `+${digitsOnly}`
    return PHONE_E164_REGEX.test(normalizedWithPlus) ? normalizedWithPlus : null
  }

  if (digitsOnly.startsWith('55')) {
    const normalizedBr = `+${digitsOnly}`
    return PHONE_E164_REGEX.test(normalizedBr) ? normalizedBr : null
  }

  return null
}

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) {
    return '***'
  }

  return `${phone.slice(0, 3)}***${phone.slice(-2)}`
}

const isSmsEnabled = (): boolean => process.env.ENABLE_SMS?.toLowerCase() !== 'false'

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
            // Silencioso para ambientes em que set de cookie não é permitido nesta fase da request.
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

    const { data: contatos, error: contatosError } = await supabaseAdmin
      .from('emergency_contacts')
      .select('telefone')
      .eq('user_id', user.id)
      .eq('ativo', true)

    if (contatosError) {
      logError('contacts_fetch_error', {
        requestId,
        userId: user.id,
        code: contatosError.code,
        message: contatosError.message,
        details: contatosError.details,
      })
      return NextResponse.json(
        { error: 'Erro ao buscar contatos de emergência', requestId },
        { status: 500 }
      )
    }

    if (!contatos || contatos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato de emergência ativo', requestId },
        { status: 400 }
      )
    }

    const contatosValidos = (contatos as EmergencyContactRow[])
      .map((contato) => {
        const telefoneOriginal = contato.telefone?.trim() ?? ''
        return {
          telefoneOriginal,
          telefoneE164: normalizePhoneToE164(telefoneOriginal),
        }
      })
      .filter((contato) => contato.telefoneE164)

    if (contatosValidos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum telefone válido no formato E.164', requestId },
        { status: 400 }
      )
    }

    const smsEnabled = isSmsEnabled()
    const twilioAccount = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER
    const twilioConfigured = Boolean(twilioAccount && twilioToken && twilioPhone)

    logInfo('alert_registered', {
      requestId,
      userId: user.id,
      contactsCount: contatos.length,
      validContactsCount: contatosValidos.length,
      sendAttempts: smsEnabled && twilioConfigured ? contatosValidos.length : 0,
      smsEnabled,
      twilioConfigured,
    })

    if (!smsEnabled || !twilioConfigured) {
      const reason = !smsEnabled ? 'sms_disabled_by_flag' : 'twilio_not_configured'

      logInfo('sms_skipped', {
        requestId,
        userId: user.id,
        contactsCount: contatos.length,
        validContactsCount: contatosValidos.length,
        sendAttempts: 0,
        reason,
      })

      contatosValidos.forEach(({ telefoneE164 }) => {
        if (telefoneE164) {
          logInfo('mock_sms_dispatch', {
            requestId,
            userId: user.id,
            toMasked: maskPhone(telefoneE164),
            mode: 'mock',
          })
        }
      })

      return NextResponse.json({
        success: true,
        requestId,
        summary: {
          totalContatos: contatos.length,
          validos: contatosValidos.length,
          enviados: 0,
          falhas: 0,
        },
      })
    }

    const twilioClient = twilio(twilioAccount, twilioToken)

    const mensagem = `🚨 ALERTA DE EMERGÊNCIA 🚨\nEstou em risco e preciso de ajuda.\n\n📍 Minha localização:\nhttps://maps.google.com/?q=${latitude},${longitude}`

    const sendResults = await Promise.allSettled(
      contatosValidos.map(async ({ telefoneE164, telefoneOriginal }, index) => {
        try {
          const response = await withTimeout<any>(
            twilioClient.messages.create({
              body: mensagem,
              from: twilioPhone,
              to: telefoneE164!,
            }),
            TWILIO_SEND_TIMEOUT_MS,
            `Twilio send para ${telefoneE164}`
          )

          logInfo('twilio_send_success', {
            requestId,
            userId: user.id,
            sendAttempts: index + 1,
            toMasked: maskPhone(telefoneE164!),
            sid: response.sid,
          })

          return {
            ok: true,
            to: telefoneE164,
            sid: response.sid,
            original: telefoneOriginal,
          }
        } catch (error) {
          const twilioError = error as { message?: string; code?: number }
          logError('twilio_send_error', {
            requestId,
            userId: user.id,
            sendAttempts: index + 1,
            toMasked: maskPhone(telefoneE164!),
            message: twilioError?.message,
            code: twilioError?.code,
          })

          return {
            ok: false,
            to: telefoneE164,
            original: telefoneOriginal,
            error: twilioError?.message ?? 'Erro desconhecido no envio',
          }
        }
      })
    )

    const valores = sendResults.flatMap((result) => {
      if (result.status === 'fulfilled') {
        return [result.value]
      }

      return []
    })

    const enviados = valores.filter((result) => result.ok)
    const falhas = valores.filter((result) => !result.ok)

    logInfo('send_summary', {
      requestId,
      userId: user.id,
      contactsCount: contatos.length,
      validContactsCount: contatosValidos.length,
      sendAttempts: contatosValidos.length,
      enviados: enviados.length,
      falhas: falhas.length,
    })

    return NextResponse.json({
      success: true,
      requestId,
      summary: {
        totalContatos: contatos.length,
        validos: contatosValidos.length,
        enviados: enviados.length,
        falhas: falhas.length,
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
