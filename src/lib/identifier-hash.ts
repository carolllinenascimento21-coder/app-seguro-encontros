import { createHash } from 'crypto'

const PHONE_PUNCTUATION = /[\s().\-+]/g

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
  if (!value) return 'generic'
  if (value === 'telefone') return 'phone'
  return value
}
