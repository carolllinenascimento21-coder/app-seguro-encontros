import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RawPlan = Record<string, any>

type NormalizedPlan = {
  id: string
  name?: string | null
  description?: string | null
  price?: number | null
  priceFormatted?: string | null
  currency?: string | null
  interval?: string | null
  type?: string | null
  credits?: number | null
  lookupKeys: string[]
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const normalizePlan = (plan: RawPlan): NormalizedPlan => {
  const lookupKeys = [
    plan.id,
    plan.slug,
    plan.plan_id,
    plan.key,
    plan.code,
    plan.name,
  ]
    .filter(Boolean)
    .map((value: unknown) => String(value))

  const priceRaw = plan.price ?? plan.price_cents ?? plan.amount ?? plan.value

  return {
    id: String(plan.id ?? plan.slug ?? plan.plan_id ?? plan.key ?? plan.code ?? plan.name),
    name: plan.name ?? plan.title ?? plan.plan_name ?? null,
    description: plan.description ?? plan.summary ?? null,
    price: toNumber(priceRaw),
    priceFormatted: plan.price_formatted ?? plan.display_price ?? null,
    currency: plan.currency ?? 'BRL',
    interval: plan.interval ?? plan.billing_interval ?? plan.period ?? null,
    type: plan.type ?? plan.category ?? (plan.credits ? 'credits' : 'subscription'),
    credits: plan.credits ?? plan.credit_amount ?? null,
    lookupKeys,
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from('plans').select('*')

  if (error) {
    console.error('Erro ao carregar planos', error)
    return NextResponse.json({
      plans: [],
      error: error.message,
    })
  }

  const plans = (data ?? []).map(normalizePlan)

  return NextResponse.json({ plans })
}
