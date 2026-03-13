import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { stripe } from '@/lib/stripe/server'
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

  const supabase = await createServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[stripe-credits-checkout] unauthorized', {
      userError: userError?.message,
      cookies: cookieStore.getAll().length,
    })

    return NextResponse.json(
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  }

  const body = (await req.json()) as { packId?: string }

  const pack =
    body.packId &&
    CREDIT_PACKS[body.packId as keyof typeof CREDIT_PACKS]

  if (!pack) {
    return NextResponse.json(
      { error: 'Pacote inválido' },
      { status: 400 }
    )
  }

  const priceId = process.env[pack.priceEnv]

  if (!priceId) {
    return NextResponse.json(
      { error: 'Preço não configurado' },
      { status: 500 }
    )
  }

  const siteUrl = getSiteUrl()

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',

      line_items: [{ price: priceId, quantity: 1 }],

      customer_email: user.email ?? undefined,

      metadata: {
        user_id: user.id,
        credits: pack.amount.toString(),
        pack_id: body.packId ?? '',
      },

      success_url: `${siteUrl}/planos?creditsCheckout=success`,
      cancel_url: `${siteUrl}/planos?creditsCheckout=cancel`,
    },
    {
      idempotencyKey: `credits-checkout:${user.id}:${body.packId}:${Math.floor(
        Date.now() / 30000
      )}`,
    }
  )

  return NextResponse.json({
    url: session.url,
  })
}
