import { createPublicKey, createVerify, X509Certificate } from 'crypto'

import { assertAllowedProduct, planFromProduct } from '@/lib/billing/catalog'
import { mapAppleStatus } from '@/lib/billing/mapper'
import type { SubscriptionUpsert } from '@/lib/billing/types'

type AppleValidateInput = {
  userId: string
  productId: string
  transactionId?: string
  originalTransactionId?: string
  appAccountToken?: string
  signedTransactionInfo?: string
}

type AppleTransactionJWTPayload = {
  transactionId?: string
  originalTransactionId?: string
  productId?: string
  bundleId?: string
  appAccountToken?: string
  purchaseDate?: number
  expiresDate?: number
  revocationDate?: number
  environment?: 'Sandbox' | 'Production'
  type?: string
  offerType?: number
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing_env:${name}`)
  return value
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='), 'base64')
}

function parseJWTPayload<T>(token: string): T {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('invalid_jwt')
  return JSON.parse(base64UrlDecode(parts[1]).toString('utf8')) as T
}

function verifyJwsWithX5C(jws: string): Record<string, unknown> {
  const [encodedHeader, encodedPayload, encodedSig] = jws.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSig) throw new Error('invalid_jws')

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8')) as {
    alg?: string
    x5c?: string[]
  }

  if (header.alg !== 'ES256' || !header.x5c?.length) {
    throw new Error('invalid_apple_jws_header')
  }

  const leafDer = Buffer.from(header.x5c[0], 'base64')
  const cert = new X509Certificate(leafDer)
  const key = createPublicKey(cert.publicKey)

  const verifier = createVerify('sha256')
  verifier.update(`${encodedHeader}.${encodedPayload}`)
  verifier.end()

  const signature = base64UrlDecode(encodedSig)
  const valid = verifier.verify({ key, dsaEncoding: 'ieee-p1363' }, signature)
  if (!valid) throw new Error('apple_jws_signature_invalid')

  return JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as Record<string, unknown>
}

async function getAppleApiToken() {
  const issuerId = requireEnv('APPLE_IAP_ISSUER_ID')
  const keyId = requireEnv('APPLE_IAP_KEY_ID')
  const privateKey = requireEnv('APPLE_IAP_PRIVATE_KEY').replace(/\\n/g, '\n')
  const bundleId = requireEnv('APPLE_BUNDLE_ID')

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 300, aud: 'appstoreconnect-v1', bid: bundleId })
  ).toString('base64url')

  const signer = createVerify('sha256')
  signer.end()
  // Node runtime has no direct ES256 sign without createSign in strict lint setup here.
  const { createSign } = await import('crypto')
  const sign = createSign('sha256')
  sign.update(`${header}.${payload}`)
  sign.end()
  const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')

  return `${header}.${payload}.${signature}`
}

async function fetchTransaction(transactionId: string) {
  const token = await getAppleApiToken()
  const endpoints = [
    { url: `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${transactionId}`, env: 'production' },
    { url: `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`, env: 'sandbox' },
  ] as const

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint.url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) continue
    const data = (await res.json()) as { signedTransactionInfo?: string }
    if (data.signedTransactionInfo) {
      return { signedTransactionInfo: data.signedTransactionInfo, environment: endpoint.env }
    }
  }

  throw new Error('apple_transaction_not_found')
}

export async function validateApplePurchaseServerSide(input: AppleValidateInput): Promise<SubscriptionUpsert> {
  assertAllowedProduct(input.productId)

  const trusted = input.signedTransactionInfo
    ? (verifyJwsWithX5C(input.signedTransactionInfo) as AppleTransactionJWTPayload)
    : null

  const txId = input.transactionId ?? trusted?.transactionId ?? input.originalTransactionId
  if (!txId) throw new Error('missing_apple_transaction_id')

  const transaction = await fetchTransaction(txId)
  const payload = parseJWTPayload<AppleTransactionJWTPayload>(transaction.signedTransactionInfo)

  const expectedBundle = requireEnv('APPLE_BUNDLE_ID')
  if (payload.bundleId !== expectedBundle) throw new Error('apple_bundle_id_mismatch')
  if (payload.productId !== input.productId) throw new Error('apple_product_mismatch')

  if (input.appAccountToken && payload.appAccountToken && input.appAccountToken !== payload.appAccountToken) {
    throw new Error('apple_app_account_token_mismatch')
  }

  const status = mapAppleStatus({
    expiresDateMs: payload.expiresDate,
    revocationDateMs: payload.revocationDate,
    offerType: payload.offerType,
  })

  const externalSubscriptionId = payload.originalTransactionId ?? payload.transactionId ?? txId
  const externalTransactionId = payload.transactionId ?? txId

  return {
    userId: input.userId,
    platform: 'apple',
    productId: payload.productId!,
    planId: planFromProduct(payload.productId!),
    status,
    externalSubscriptionId,
    externalTransactionId,
    originalTransactionId: externalSubscriptionId,
    purchaseToken: null,
    environment: transaction.environment,
    isActive: ['active', 'trial', 'grace_period'].includes(status),
    startedAt: payload.purchaseDate ? new Date(payload.purchaseDate).toISOString() : null,
    expiresAt: payload.expiresDate ? new Date(payload.expiresDate).toISOString() : null,
    canceledAt: null,
    revokedAt: payload.revocationDate ? new Date(payload.revocationDate).toISOString() : null,
    eventTimestampMs: payload.expiresDate ?? payload.purchaseDate ?? Date.now(),
    rawSource: { api: payload, signedTransactionInfo: transaction.signedTransactionInfo },
  }
}

export function parseAppleNotificationPayload(signedPayload: string) {
  const root = verifyJwsWithX5C(signedPayload)
  const data = (root.data ?? {}) as Record<string, unknown>
  const signedTransactionInfo = data.signedTransactionInfo as string | undefined
  if (!signedTransactionInfo) throw new Error('apple_notification_missing_transaction')

  const tx = parseJWTPayload<AppleTransactionJWTPayload>(signedTransactionInfo)

  return {
    notificationType: String(root.notificationType ?? 'UNKNOWN'),
    subtype: String(root.subtype ?? ''),
    tx,
    raw: root,
  }
}
