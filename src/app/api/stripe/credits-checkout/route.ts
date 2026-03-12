import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getStripeClient } from '@/lib/stripe'
import { getSiteUrl } from '@/lib/billing'
import { createServerClient } from '@/lib/supabase/server'

const CREDIT_PACKS = {
  credits_3: {
    priceEnv: 'STRIPE_PRICE_CREDITS_3',
    amount: 3,
  },
  credits_10: {
    priceEnv: 'STRIPE_PRICE_CREDITS_10',
    amount: 10,
  },
  credits_25: {
    priceEnv: 'STRIPE_PRICE_CREDITS_25',
    amount: 25,
  },
} as const

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const hasAuthCookies = cookieStore
    .getAll()
    .some((cookie) => cookie.name.includes('supabase') || cookie.name.startsWith('sb-'))

  const supabase = await createServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[stripe-credits-checkout] unauthorized request', {
      hasAuthCookies,
      userError: userError?.message,
    })
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
  }

  const body = (await req.json()) as { packId?: string }
  const pack = body.packId ? CREDIT_PACKS[body.packId as keyof typeof CREDIT_PACKS] : null

  if (!pack) {
    return NextResponse.json({ error: 'Pacote inválido' }, { status: 400 })
  }

  const priceId = process.env[pack.priceEnv]
  if (!priceId) {
    return NextResponse.json({ error: 'Preço não configurado' }, { status: 500 })
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 })
  }

  const siteUrl = getSiteUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    success_url: `${siteUrl}/creditos?status=success`,
    cancel_url: `${siteUrl}/creditos?status=cancel`,
    metadata: {
      user_id: user.id,
      credits: pack.amount.toString(),
      pack_id: body.packId ?? '',
    },
  }, {
    idempotencyKey: `credits-checkout:${user.id}:${body.packId}:${Math.floor(Date.now() / 30000)}`,
  })

  return NextResponse.json({ url: session.url })
}
