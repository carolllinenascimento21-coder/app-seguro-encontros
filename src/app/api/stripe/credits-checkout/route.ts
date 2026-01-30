import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getStripeClient } from '@/lib/stripe'
import { getSiteUrl } from '@/lib/billing'

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
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticada' }, { status: 401 })
  }

  const body = await req.json()
  const pack = CREDIT_PACKS[body.packId]

  if (!pack) {
    return NextResponse.json({ error: 'Pacote inválido' }, { status: 400 })
  }

  const priceId = process.env[pack.priceEnv]
  if (!priceId) {
    return NextResponse.json({ error: 'Preço não configurado' }, { status: 500 })
  }

  const stripe = getStripeClient()
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
    },
  })

  return NextResponse.json({ url: session.url })
}
