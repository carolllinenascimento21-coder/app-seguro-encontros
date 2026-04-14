import { NextResponse } from 'next/server'

import { validateApplePurchaseAndPersist, validateGooglePurchaseAndPersist } from '@/lib/billing/service'
import { createServerClient } from '@/lib/supabase/server'

type LegacyBody = {
  productId?: string
  purchaseData?: Record<string, unknown>
  restoreData?: Array<Record<string, unknown>> | Record<string, unknown>
}

function normalizeRestore(restoreData: LegacyBody['restoreData']) {
  if (!restoreData) return []
  if (Array.isArray(restoreData)) return restoreData
  if (Array.isArray((restoreData as Record<string, unknown>).purchases)) {
    return (restoreData as Record<string, unknown>).purchases as Array<Record<string, unknown>>
  }
  return [restoreData as Record<string, unknown>]
}

async function dispatch(userId: string, productId: string, payload: Record<string, unknown>) {
  if (payload.transactionId || payload.originalTransactionId || payload.platform === 'apple') {
    return validateApplePurchaseAndPersist({
      userId,
      productId,
      transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : undefined,
      originalTransactionId:
        typeof payload.originalTransactionId === 'string' ? payload.originalTransactionId : undefined,
      appAccountToken: typeof payload.appAccountToken === 'string' ? payload.appAccountToken : undefined,
      signedTransactionInfo:
        typeof payload.signedTransactionInfo === 'string' ? payload.signedTransactionInfo : undefined,
    })
  }

  if (typeof payload.purchaseToken === 'string') {
    return validateGooglePurchaseAndPersist({
      userId,
      productId,
      purchaseToken: payload.purchaseToken,
      packageName:
        typeof payload.packageName === 'string'
          ? payload.packageName
          : process.env.GOOGLE_PLAY_PACKAGE_NAME ?? '',
    })
  }

  throw new Error('legacy_payload_platform_not_detected')
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const body = (await req.json()) as LegacyBody

    if (body.productId && body.purchaseData) {
      const result = await dispatch(user.id, body.productId, body.purchaseData)
      return NextResponse.json(result)
    }

    const restored = normalizeRestore(body.restoreData)
    for (const item of restored) {
      const productId = typeof item.productId === 'string' ? item.productId : ''
      if (!productId) continue
      const result = await dispatch(user.id, productId, item)
      return NextResponse.json({ ...result, restored: true })
    }

    return NextResponse.json({ error: 'Nenhuma compra elegível para restaurar' }, { status: 404 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao validar compra mobile' },
      { status: 500 }
    )
  }
}
