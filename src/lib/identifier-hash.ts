import { createHash } from 'crypto'

const PHONE_PUNCTUATION = /[\s().\-+]/g

export const SUPPORTED_IDENTIFIER_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'tinder',
  'linkedin',
  'telegram',
  'whatsapp',
  'telefone',
  'outro',
] as const

export type SupportedIdentifierPlatform = (typeof SUPPORTED_IDENTIFIER_PLATFORMS)[number]

export type IdentifierInput = Partial<Record<SupportedIdentifierPlatform, string | null>>

export function normalizeIdentifier(identifier: string, platform?: string | null): string {
  const normalizedPlatform = (platform ?? '').trim().toLowerCase()

  let normalized = identifier.trim().toLowerCase()

  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1)
  }

  if (normalizedPlatform === 'phone' || normalizedPlatform === 'telefone') {
    normalized = normalized.replace(PHONE_PUNCTUATION, '')
  } else {
    normalized = normalized.replace(/\s+/g, '')
  }

  return normalized
}

export function hashIdentifier(identifier: string, platform?: string | null): string {
  const normalized = normalizeIdentifier(identifier, platform)

  return createHash('sha256').update(normalized).digest('hex')
}

export function normalizeIdentifierPlatform(platform: string | null | undefined): string {
  const value = (platform ?? '').trim().toLowerCase()
  if (!value) return 'outro'
  if (value === 'phone') return 'telefone'
  return value
}

export function extractIdentifierInputs(value: unknown): IdentifierInput {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return SUPPORTED_IDENTIFIER_PLATFORMS.reduce<IdentifierInput>((acc, key) => {
    const rawValue = source[key]
    if (typeof rawValue !== 'string') {
      acc[key] = null
      return acc
    }

    const trimmed = rawValue.trim()
    acc[key] = trimmed ? trimmed : null
    return acc
  }, {})
}
