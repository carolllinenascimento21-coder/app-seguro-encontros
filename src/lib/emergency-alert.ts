import { FEATURES } from '@/lib/feature-flags'

export const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/
export const ALERT_COOLDOWN_MS = 2 * 60 * 1000
export const MAX_CONTACTS_PER_ALERT = 3

export type EmergencyContact = {
  id?: number | string
  nome?: string | null
  telefone: string | null
  push_token?: string | null
  push_platform?: 'android' | 'ios' | null
}

export type ChannelUsage = 'push' | 'whatsapp' | 'sms'

export type ChannelDispatchStatus = 'success' | 'failed' | 'skipped'

export type EmergencyDispatchResult = {
  push: ChannelDispatchStatus
  whatsapp: ChannelDispatchStatus
  sms: ChannelDispatchStatus
  overall_status: 'success' | 'partial_success' | 'failed'
  channels_used: ChannelUsage[]
  error?: string
}

type SanitizedEmergencyContact = EmergencyContact & {
  telefoneOriginal: string
  telefoneE164: string
}

export const normalizePhoneToE164 = (rawPhone: string): string | null => {
  const digitsOnly = rawPhone.replace(/\D/g, '')

  if (!digitsOnly) return null

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

export const maskPhone = (rawPhone: string | null | undefined) => {
  if (!rawPhone) return ''

  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length < 8) return '****'

  const ddd = digits.slice(0, 2)
  const prefixFirst = digits.slice(2, 3)
  const suffix = digits.slice(-4)
  return `(${ddd}) ${prefixFirst}****-${suffix}`
}

export const sanitizeContactsForAlert = (contacts: EmergencyContact[]) => {
  const uniquePhones = new Set<string>()

  return contacts
    .map((contact) => {
      const telefoneOriginal = contact.telefone?.trim() ?? ''
      return {
        ...contact,
        telefoneOriginal,
        telefoneE164: normalizePhoneToE164(telefoneOriginal),
      }
    })
    .filter((contact): contact is SanitizedEmergencyContact => Boolean(contact.telefoneE164))
    .filter((contact) => {
      if (uniquePhones.has(contact.telefoneE164)) return false
      uniquePhones.add(contact.telefoneE164)
      return true
    })
    .slice(0, MAX_CONTACTS_PER_ALERT)
}

export const isWithinCooldown = (
  lastAlertAt: string | null | undefined,
  now = Date.now(),
  cooldownMs = ALERT_COOLDOWN_MS
) => {
  if (!lastAlertAt) return false

  const lastTimestamp = new Date(lastAlertAt).getTime()
  if (Number.isNaN(lastTimestamp)) return false

  return now - lastTimestamp < cooldownMs
}

export const computeSmsTargets = (params: {
  contacts: Array<{ telefoneE164: string; telefoneOriginal: string }>
  whatsappConfigured: boolean
  whatsappSentTo: Set<string>
}) => {
  if (!params.whatsappConfigured) return params.contacts

  return params.contacts.filter((contact) => !params.whatsappSentTo.has(contact.telefoneE164))
}

const sendPush = async (contacts: SanitizedEmergencyContact[]) => {
  if (!FEATURES.ENABLE_PUSH) return false

  const hasAtLeastOneToken = contacts.some((contact) => Boolean(contact.push_token?.trim()))
  return hasAtLeastOneToken
}

const sendWhatsApp = async (contacts: SanitizedEmergencyContact[]) => {
  if (!FEATURES.ENABLE_WHATSAPP || contacts.length === 0) return false
  return true
}

const sendSms = async (contacts: SanitizedEmergencyContact[]) => {
  if (!FEATURES.ENABLE_SMS || contacts.length === 0) return false
  return true
}

export const dispatchEmergencyAlert = async (
  contacts: SanitizedEmergencyContact[]
): Promise<EmergencyDispatchResult> => {
  const result: EmergencyDispatchResult = {
    push: FEATURES.ENABLE_PUSH ? 'failed' : 'skipped',
    whatsapp: FEATURES.ENABLE_WHATSAPP ? 'failed' : 'skipped',
    sms: FEATURES.ENABLE_SMS ? 'failed' : 'skipped',
    overall_status: 'failed',
    channels_used: [],
  }

  try {
    if (FEATURES.ENABLE_PUSH) {
      const pushOk = await sendPush(contacts)
      result.push = pushOk ? 'success' : 'failed'
      if (pushOk) result.channels_used.push('push')
    }

    if (FEATURES.ENABLE_WHATSAPP) {
      const whatsappOk = await sendWhatsApp(contacts)
      result.whatsapp = whatsappOk ? 'success' : 'failed'
      if (whatsappOk) result.channels_used.push('whatsapp')

      if (FEATURES.ENABLE_SMS && !whatsappOk) {
        const smsTargets = computeSmsTargets({
          contacts,
          whatsappConfigured: FEATURES.ENABLE_WHATSAPP,
          whatsappSentTo: whatsappOk ? new Set(contacts.map((c) => c.telefoneE164)) : new Set<string>(),
        })
        const smsOk = await sendSms(smsTargets)
        result.sms = smsOk ? 'success' : 'failed'
        if (smsOk) result.channels_used.push('sms')
      } else if (FEATURES.ENABLE_SMS) {
        result.sms = 'skipped'
      }
    } else if (FEATURES.ENABLE_SMS) {
      result.sms = 'skipped'
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Erro desconhecido'
  }

  const successfulChannels = [result.push, result.whatsapp, result.sms].filter((s) => s === 'success').length
  const attemptedChannels = [result.push, result.whatsapp, result.sms].filter((s) => s !== 'skipped').length

  if (successfulChannels > 0 && successfulChannels === attemptedChannels) {
    result.overall_status = 'success'
  } else if (successfulChannels > 0) {
    result.overall_status = 'partial_success'
  } else {
    result.overall_status = 'failed'
  }

  return result
}

export const buildEmergencyLog = (params: {
  userId: string
  contactsSent?: string[]
  contactsCount?: number
  channelsUsed: ChannelUsage[]
  status: 'success' | 'partial_success' | 'failed'
  error?: string
}) =>
  typeof params.contactsCount === 'number'
    ? {
        user_id: params.userId,
        contacts_count: params.contactsCount,
        channels_used: params.channelsUsed,
        status: params.status,
      }
    : {
        user_id: params.userId,
        contatos_enviados: params.contactsSent ?? [],
        canais_utilizados: params.channelsUsed,
        status: params.status,
        erro: params.error,
      }
