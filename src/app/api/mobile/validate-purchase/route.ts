import { NextResponse } from 'next/server'

import { mapProductToPlan } from '@/lib/mobile-billing'
import { validateMobilePurchase } from '@/lib/mobile-receipt-validation'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

type ValidateBody = {
  productId?: string
  purchaseData?: unknown
  restoreData?: unknown
}

async function applyValidatedPlan(userId: string, planId: 'premium_monthly' | 'premium_yearly') {
  const supabaseAdmin = getSupabaseAdminClient()
  if (!supabaseAdmin) {
    throw new Error('Supabase admin indisponível para atualizar perfil')
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      current_plan_id: planId,
      subscription_status: 'active',
      has_active_plan: true,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Falha ao atualizar perfil: ${error.message}`)
  }
}

function normalizeRestorePayload(restoreData: unknown): Array<{ productId: string; purchaseData: unknown }> {
  if (Array.isArray(restoreData)) {
    return restoreData
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(item => ({
        productId: String(item.productId ?? ''),
        purchaseData: item,
      }))
      .filter(item => Boolean(item.productId))
  }

  if (restoreData && typeof restoreData === 'object') {
    const objectData = restoreData as Record<string, unknown>

    const purchases = objectData.purchases
    if (Array.isArray(purchases)) {
      return purchases
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map(item => ({
          productId: String(item.productId ?? ''),
          purchaseData: item,
        }))
        .filter(item => Boolean(item.productId))
    }

    if (typeof objectData.productId === 'string') {
      return [
        {
          productId: objectData.productId,
          purchaseData: objectData,
        },
      ]
    }
  }

  return []
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

    const body = (await req.json()) as ValidateBody

    if (body.productId && body.purchaseData) {
      const mapped = mapProductToPlan(body.productId)
      if (!mapped) {
        return NextResponse.json({ error: 'Produto mobile não suportado' }, { status: 400 })
      }

      const validated = await validateMobilePurchase({
        productId: body.productId,
        purchaseData: body.purchaseData,
      })

      await applyValidatedPlan(user.id, validated.planId)

      return NextResponse.json({
        ok: true,
        source: validated.platform,
        planId: validated.planId,
        transactionRef: validated.transactionRef,
      })
    }

    const restoredPurchases = normalizeRestorePayload(body.restoreData)
    if (!restoredPurchases.length) {
      return NextResponse.json({ error: 'Payload de compra/restauração inválido' }, { status: 400 })
    }

    for (const restored of restoredPurchases) {
      const mapped = mapProductToPlan(restored.productId)
      if (!mapped) {
        continue
      }

      const validated = await validateMobilePurchase({
        productId: restored.productId,
        purchaseData: restored.purchaseData,
      })

      await applyValidatedPlan(user.id, validated.planId)

      return NextResponse.json({
        ok: true,
        restored: true,
        source: validated.platform,
        planId: validated.planId,
        transactionRef: validated.transactionRef,
      })
    }

    return NextResponse.json({ error: 'Nenhuma compra elegível para restaurar' }, { status: 404 })
  } catch (error: any) {
    console.error('[mobile-validate-purchase] error', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao validar compra mobile' },
      { status: 500 }
    )
  }
}
