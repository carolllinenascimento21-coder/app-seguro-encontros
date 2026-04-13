import { createSign } from 'crypto'

import { mapProductToPlan, type CanonicalPlanId } from '@/lib/mobile-billing'

type AppleValidationPayload = {
  productId: string
  purchaseData: Record<string, unknown>
}

type GoogleValidationPayload = {
  productId: string
  purchaseData: Record<string, unknown>
}

export type MobileValidationResult = {
  planId: CanonicalPlanId
  productId: string
  platform: 'apple' | 'google'
  transactionRef: string
}

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(payload) as T
  } catch {
    return null
  }
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n')
}

function toEpochSeconds() {
  return Math.floor(Date.now() / 1000)
}

function createSignedJwt(params: {
  header: Record<string, string>
  payload: Record<string, unknown>
  privateKey: string
  algorithm: 'RS256' | 'ES256'
}) {
  const encodedHeader = base64UrlEncode(JSON.stringify(params.header))
  const encodedPayload = base64UrlEncode(JSON.stringify(params.payload))
  const toSign = `${encodedHeader}.${encodedPayload}`

  const signer = createSign('SHA256')
  signer.update(toSign)
  signer.end()

  const signature = signer.sign({
    key: params.privateKey,
    dsaEncoding: params.algorithm === 'ES256' ? 'ieee-p1363' : undefined,
  })

  const encodedSignature = signature
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${toSign}.${encodedSignature}`
}

async function validateApplePurchase({
  productId,
  purchaseData,
}: AppleValidationPayload): Promise<MobileValidationResult> {
  const transactionId =
    String(purchaseData.transactionId ?? purchaseData.originalTransactionId ?? '').trim()

  if (!transactionId) {
    throw new Error('Apple purchase sem transactionId/originalTransactionId')
  }

  const issuerId = requireEnv('APPLE_IAP_ISSUER_ID')
  const keyId = requireEnv('APPLE_IAP_KEY_ID')
  const privateKey = normalizePem(requireEnv('APPLE_IAP_PRIVATE_KEY'))
  const bundleId = requireEnv('APPLE_BUNDLE_ID')

  const issuedAt = toEpochSeconds()
  const jwt = createSignedJwt({
    header: { alg: 'ES256', kid: keyId, typ: 'JWT' },
    payload: {
      iss: issuerId,
      iat: issuedAt,
      exp: issuedAt + 300,
      aud: 'appstoreconnect-v1',
      bid: bundleId,
    },
    privateKey,
    algorithm: 'ES256',
  })

  const endpoints = [
    `https://api.storekit.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
    `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`,
  ]

  let responseBody: any = null
  let ok = false

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${jwt}` },
    })

    if (response.ok) {
      ok = true
      responseBody = await response.json()
      break
    }
  }

  if (!ok || !responseBody?.signedTransactionInfo) {
    throw new Error('Falha ao validar recibo Apple com App Store Server API')
  }

  const parsedInfo = decodeJwtPayload<{
    productId?: string
    bundleId?: string
    expiresDate?: number
    revocationDate?: number
  }>(responseBody.signedTransactionInfo)

  if (!parsedInfo?.productId || parsedInfo.productId !== productId) {
    throw new Error('Produto Apple inválido para a transação informada')
  }

  if (parsedInfo.bundleId !== bundleId) {
    throw new Error('Bundle Apple divergente')
  }

  if (parsedInfo.revocationDate) {
    throw new Error('Assinatura Apple revogada')
  }

  if (parsedInfo.expiresDate && Number(parsedInfo.expiresDate) < Date.now()) {
    throw new Error('Assinatura Apple expirada')
  }

  const planId = mapProductToPlan(productId)
  if (!planId) {
    throw new Error('Produto Apple não mapeado para plano interno')
  }

  return {
    planId,
    productId,
    platform: 'apple',
    transactionRef: transactionId,
  }
}

async function getGoogleAccessToken() {
  const clientEmail = requireEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL')
  const privateKey = normalizePem(requireEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY'))

  const issuedAt = toEpochSeconds()

  const assertion = createSignedJwt({
    header: { alg: 'RS256', typ: 'JWT' },
    payload: {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: issuedAt + 3600,
      iat: issuedAt,
    },
    privateKey,
    algorithm: 'RS256',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.access_token) {
    throw new Error('Falha ao autenticar Google Play API')
  }

  return String(data.access_token)
}

async function validateGooglePurchase({
  productId,
  purchaseData,
}: GoogleValidationPayload): Promise<MobileValidationResult> {
  const purchaseToken = String(purchaseData.purchaseToken ?? '').trim()
  const packageName = String(
    purchaseData.packageName ?? process.env.GOOGLE_PLAY_PACKAGE_NAME ?? 'br.com.wpssistemas.confiamais'
  ).trim()

  if (!purchaseToken) {
    throw new Error('Google purchase sem purchaseToken')
  }

  const accessToken = await getGoogleAccessToken()

  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error('Falha ao validar compra Google Play')
  }

  const latestOrderId = String(data.latestOrderId ?? purchaseToken)
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []
  const hasMatchingProduct = lineItems.some(
    (item: Record<string, unknown>) => String(item.productId ?? '') === productId
  )

  if (!hasMatchingProduct) {
    throw new Error('Produto Google inválido para o purchaseToken')
  }

  const subscriptionState = String(data.subscriptionState ?? '')
  if (subscriptionState && subscriptionState !== 'SUBSCRIPTION_STATE_ACTIVE') {
    throw new Error(`Assinatura Google não ativa (${subscriptionState})`)
  }

  const planId = mapProductToPlan(productId)
  if (!planId) {
    throw new Error('Produto Google não mapeado para plano interno')
  }

  return {
    planId,
    productId,
    platform: 'google',
    transactionRef: latestOrderId,
  }
}

export async function validateMobilePurchase(payload: {
  productId: string
  purchaseData: unknown
}) {
  const { productId, purchaseData } = payload

  if (!purchaseData || typeof purchaseData !== 'object') {
    throw new Error('purchaseData inválido')
  }

  const objectPayload = purchaseData as Record<string, unknown>

  const platform = String(objectPayload.platform ?? '').toLowerCase()
  if (platform === 'ios' || platform === 'apple' || platform === 'appstore') {
    return validateApplePurchase({
      productId,
      purchaseData: objectPayload,
    })
  }

  if (platform === 'android' || platform === 'google' || platform === 'playstore') {
    return validateGooglePurchase({
      productId,
      purchaseData: objectPayload,
    })
  }

  if (objectPayload.transactionId || objectPayload.originalTransactionId) {
    return validateApplePurchase({
      productId,
      purchaseData: objectPayload,
    })
  }

  if (objectPayload.purchaseToken) {
    return validateGooglePurchase({
      productId,
      purchaseData: objectPayload,
    })
  }

  throw new Error('Não foi possível detectar a plataforma da compra mobile')
}
