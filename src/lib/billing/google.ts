import { createSign } from 'crypto'

import { assertAllowedProduct, planFromProduct } from '@/lib/billing/catalog'
import { mapGoogleStatus } from '@/lib/billing/mapper'
import type { SubscriptionUpsert } from '@/lib/billing/types'

type GoogleValidateInput = {
  userId: string
  productId: string
  purchaseToken: string
  packageName: string
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing_env:${name}`)
  return value
}

async function getGoogleAccessToken() {
  const clientEmail = requireEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL')
  const privateKey = requireEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url')

  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  signer.end()
  const signature = signer.sign(privateKey).toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${signature}`,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.access_token) throw new Error('google_access_token_failed')

  return String(body.access_token)
}

export async function fetchGoogleSubscription(params: {
  packageName: string
  purchaseToken: string
}) {
  const accessToken = await getGoogleAccessToken()

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${params.packageName}/purchases/subscriptionsv2/tokens/${params.purchaseToken}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`google_subscription_fetch_failed:${res.status}`)
  }

  return body as Record<string, unknown>
}

export async function validateGooglePurchaseServerSide(input: GoogleValidateInput): Promise<SubscriptionUpsert> {
  assertAllowedProduct(input.productId)

  const expectedPackage = requireEnv('GOOGLE_PLAY_PACKAGE_NAME')
  if (input.packageName !== expectedPackage) throw new Error('google_package_name_mismatch')

  const subscription = await fetchGoogleSubscription({
    packageName: input.packageName,
    purchaseToken: input.purchaseToken,
  })

  const lineItems = Array.isArray(subscription.lineItems) ? subscription.lineItems : []
  const item = lineItems.find(
    maybe => maybe && typeof maybe === 'object' && String((maybe as Record<string, unknown>).productId ?? '') === input.productId
  ) as Record<string, unknown> | undefined

  if (!item) throw new Error('google_product_mismatch')

  const status = mapGoogleStatus(String(subscription.subscriptionState ?? ''))
  const expiryMs = Number(item.expiryTime ?? 0)

  return {
    userId: input.userId,
    platform: 'google',
    productId: input.productId,
    planId: planFromProduct(input.productId),
    status,
    externalSubscriptionId: String(subscription.latestOrderId ?? input.purchaseToken),
    externalTransactionId: String(subscription.latestOrderId ?? input.purchaseToken),
    originalTransactionId: String(subscription.startTime ?? input.purchaseToken),
    purchaseToken: input.purchaseToken,
    environment: 'production',
    isActive: ['active', 'trial', 'grace_period'].includes(status),
    startedAt: subscription.startTime ? new Date(String(subscription.startTime)).toISOString() : null,
    expiresAt: expiryMs ? new Date(expiryMs).toISOString() : null,
    canceledAt: subscription.canceledStateContext ? new Date().toISOString() : null,
    revokedAt: null,
    eventTimestampMs: expiryMs || Date.now(),
    rawSource: subscription,
  }
}

export function parseGoogleRtdn(messageDataBase64: string) {
  const json = Buffer.from(messageDataBase64, 'base64').toString('utf8')
  const parsed = JSON.parse(json) as Record<string, unknown>

  const sub = (parsed.subscriptionNotification ?? {}) as Record<string, unknown>
  return {
    packageName: String(parsed.packageName ?? ''),
    purchaseToken: String(sub.purchaseToken ?? ''),
    notificationType: String(sub.notificationType ?? ''),
    eventTimeMillis: Number(parsed.eventTimeMillis ?? Date.now()),
    raw: parsed,
  }
}
