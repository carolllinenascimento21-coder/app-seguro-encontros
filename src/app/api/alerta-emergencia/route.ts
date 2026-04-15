import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

type AlertRequestBody = {
  latitude?: number
  longitude?: number
  confirmation?: boolean
}

type EmergencyContactRow = {
  id: string
  user_id: string
  nome: string | null
  telefone: string | null
  ativo: boolean | null
  created_at?: string | null
}

const ALERT_COOLDOWN_MS = 2 * 60 * 1000
const MAX_CONTACTS = 3

const ENABLE_PUSH = process.env.ENABLE_PUSH === 'true'
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP === 'true'
const ENABLE_SMS = process.env.ENABLE_SMS === 'true'

function jsonError(
  error: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error, ...extra }, { status })
}

function isValidCoordinates(latitude?: number, longitude?: number) {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  )
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return null

  return hasPlus ? `+${digits}` : digits
}

function maskPhone(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone)
  if (!normalized) return 'invalid'

  const raw = normalized.replace('+', '')
  if (raw.length <= 4) return `***${raw}`

  return `${normalized.startsWith('+') ? '+' : ''}${raw.slice(0, 2)}***${raw.slice(-2)}`
}

function isWithinCooldown(lastAlertAt: string | null | undefined): boolean {
  if (!lastAlertAt) return false

  const timestamp = new Date(lastAlertAt).getTime()
  if (Number.isNaN(timestamp)) return false

  return Date.now() - timestamp < ALERT_COOLDOWN_MS
}

async function sendPushAlerts(_contacts: EmergencyContactRow[], _message: string) {
  return {
    enabled: ENABLE_PUSH,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }
}

async function sendWhatsAppAlerts(_contacts: EmergencyContactRow[], _message: string) {
  return {
    enabled: ENABLE_WHATSAPP,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }
}

async function sendSmsAlerts(_contacts: EmergencyContactRow[], _message: string) {
  return {
    enabled: ENABLE_SMS,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[alerta-emergencia] Missing Supabase envs', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceRoleKey: !!supabaseServiceRoleKey,
        requestId,
      })
      return jsonError('Supabase não configurado', 503, { requestId })
    }

    let body: AlertRequestBody
    try {
      body = (await request.json()) as AlertRequestBody
    } catch {
      return jsonError('Payload inválido', 400, { requestId })
    }

    const { latitude, longitude, confirmation } = body

    if (confirmation !== true) {
      return jsonError('Confirmação obrigatória', 400, { requestId })
    }

    if (!isValidCoordinates(latitude, longitude)) {
      return jsonError('Localização inválida', 400, { requestId })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[alerta-emergencia] Auth error', {
        userError,
        requestId,
      })
      return jsonError('Usuária não autenticada', 401, { requestId })
    }

    const userId = user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,last_alert_at')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('[alerta-emergencia] Profile fetch error', {
        profileError,
        userId,
        requestId,
      })
      return jsonError('Erro ao validar perfil', 500, { requestId })
    }

    if (!profile) {
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          last_alert_at: null,
        })

      if (insertProfileError) {
        console.error('[alerta-emergencia] Profile create error', {
          insertProfileError,
          userId,
          requestId,
        })
        return jsonError('Erro ao validar perfil', 500, { requestId })
      }
    }

    const effectiveLastAlertAt = profile?.last_alert_at ?? null

    if (isWithinCooldown(effectiveLastAlertAt)) {
      return jsonError('Cooldown ativo. Aguarde 2 minutos.', 429, {
        requestId,
        status: 'cooldown',
      })
    }

    let contacts: EmergencyContactRow[] | null = null
    let contactsError: unknown = null

    const contactsResult = await supabase
      .from('emergency_contacts')
      .select('id,user_id,nome,telefone,ativo,created_at')
      .eq('user_id', userId)
      .eq('ativo', true)
      .limit(MAX_CONTACTS)

    contacts = (contactsResult.data as EmergencyContactRow[] | null) ?? null
    contactsError = contactsResult.error

    if (contactsError || !contacts || contacts.length === 0) {
      const fallbackResult = await supabaseAdmin
        .from('emergency_contacts')
        .select('id,user_id,nome,telefone,ativo,created_at')
        .eq('user_id', userId)
        .eq('ativo', true)
        .limit(MAX_CONTACTS)

      contacts = (fallbackResult.data as EmergencyContactRow[] | null) ?? null
      contactsError = fallbackResult.error
    }

    if (contactsError) {
      console.error('[alerta-emergencia] Contacts fetch error', {
        contactsError,
        userId,
        requestId,
      })
      return jsonError('Erro ao buscar contatos', 500, { requestId })
    }

    const validContacts = (contacts ?? []).filter((contact) => {
      return !!normalizePhone(contact.telefone)
    })

    if (validContacts.length === 0) {
      return jsonError('Nenhum contato cadastrado', 400, { requestId })
    }

    const message =
      `🚨 ALERTA DE EMERGÊNCIA 🚨\n` +
      `Estou em risco e preciso de ajuda.\n\n` +
      `📍 Minha localização:\n` +
      `https://maps.google.com/?q=${latitude},${longitude}`

    const pushResult = await sendPushAlerts(validContacts, message)
    const whatsappResult = await sendWhatsAppAlerts(validContacts, message)
    const smsResult = await sendSmsAlerts(validContacts, message)

    const channelsUsed = [
      ...(pushResult.enabled ? ['push'] : []),
      ...(whatsappResult.enabled ? ['whatsapp'] : []),
      ...(smsResult.enabled ? ['sms'] : []),
    ]

    const totalSent =
      pushResult.sent + whatsappResult.sent + smsResult.sent

    const collectedErrors = [
      ...pushResult.errors,
      ...whatsappResult.errors,
      ...smsResult.errors,
    ]

    const overallStatus =
      totalSent > 0
        ? 'success'
        : channelsUsed.length === 0
        ? 'registered_only'
        : 'failed'

    const maskedContacts = validContacts.map((contact) => ({
      id: contact.id,
      nome: contact.nome,
      telefone: maskPhone(contact.telefone),
    }))

    const logPayload = {
      user_id: userId,
      contatos_enviados: maskedContacts,
      canais_utilizados: channelsUsed,
      status: overallStatus,
      erro: collectedErrors.length > 0 ? collectedErrors.join(' | ') : null,
      created_at: new Date().toISOString(),
    }

    const { error: logError } = await supabaseAdmin
      .from('emergency_logs')
      .insert(logPayload)

    if (logError) {
      console.error('[alerta-emergencia] Log insert error', {
        logError,
        userId,
        requestId,
      })
    }

    if (overallStatus !== 'failed') {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ last_alert_at: new Date().toISOString() })
        .eq('id', userId)

      if (updateProfileError) {
        console.error('[alerta-emergencia] last_alert_at update error', {
          updateProfileError,
          userId,
          requestId,
        })
      }
    }

    if (overallStatus === 'failed') {
      return NextResponse.json(
        {
          error: 'Falha ao enviar alerta para todos os contatos',
          requestId,
          result: {
            status: overallStatus,
            total_contacts: validContacts.length,
            channels_used: channelsUsed,
            total_sent: totalSent,
            errors: collectedErrors,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        requestId,
        result: {
          status: overallStatus,
          total_contacts: validContacts.length,
          channels_used: channelsUsed,
          total_sent: totalSent,
          push_enabled: ENABLE_PUSH,
          whatsapp_enabled: ENABLE_WHATSAPP,
          sms_enabled: ENABLE_SMS,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[alerta-emergencia] Fatal error', {
      error,
    })

    return jsonError('Erro interno', 500)
  }
}
