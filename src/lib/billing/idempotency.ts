import { createHash } from 'crypto'

export function buildIdempotencyKey(parts: Array<string | number | null | undefined>) {
  const plain = parts.map(part => String(part ?? '')).join(':')
  return createHash('sha256').update(plain).digest('hex')
}

export function stableEventKey(platform: string, externalId: string, eventType: string, eventTs: number) {
  return buildIdempotencyKey([platform, externalId, eventType, eventTs])
}
