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

export const normalizePhoneToE164 = (rawPhone: string): string | null => {
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

export const sanitizeContactsForAlert = (contacts: EmergencyContact[]) =>
  contacts
    .map((contact) => {
      const telefoneOriginal = contact.telefone?.trim() ?? ''
      return {
        ...contact,
        telefoneOriginal,
        telefoneE164: normalizePhoneToE164(telefoneOriginal),
      }
    })
    .filter((contact) => Boolean(contact.telefoneE164))
    .slice(0, MAX_CONTACTS_PER_ALERT)

export const isWithinCooldown = (
  lastAlertAt: string | null | undefined,
  now = Date.now(),
  cooldownMs = ALERT_COOLDOWN_MS
) => {
  if (!lastAlertAt) {
    return false
  }

  const lastTimestamp = new Date(lastAlertAt).getTime()
  if (Number.isNaN(lastTimestamp)) {
    return false
  }

  return now - lastTimestamp < cooldownMs
}

export const computeSmsTargets = (params: {
  contacts: Array<{ telefoneE164: string; telefoneOriginal: string }>
  whatsappConfigured: boolean
  whatsappSentTo: Set<string>
}) => {
  if (!params.whatsappConfigured) {
    return params.contacts
  }

  return params.contacts.filter(
    (contact) => !params.whatsappSentTo.has(contact.telefoneE164)
  )
}

export const buildEmergencyLog = (params: {
  userId: string
  contactsCount: number
  channelsUsed: ChannelUsage[]
  status: 'success' | 'fail'
}) => ({
  user_id: params.userId,
  contacts_count: params.contactsCount,
  channels_used: params.channelsUsed,
  status: params.status,
})
