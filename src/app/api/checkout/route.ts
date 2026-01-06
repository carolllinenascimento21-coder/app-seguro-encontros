import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

type SubscriptionTier = 'monthly' | 'annual' | 'plus'
type CreditPack = 'credits3' | 'credits10' | 'credits25'

const priceMap = {
  subscription: {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANNUAL,
    plus: process.env.STRIPE_PRICE_PLUS,
  } as Record<SubscriptionTier, string | undefined>,
  credits: {
    credits3: process.env.STRIPE_PRICE_CREDITS_3,
    credits10: process.env.STRIPE_PRICE_CREDITS_10,
    credits25: process.env.STRIPE_PRICE_CREDITS_25,
  } as Record<CreditPack, string | undefined>,
}

function getBaseUrl() {
  return (
    process.env.STRIPE_REDIRECT_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
  )
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('Erro ao obter sessão:', sessionError)
    return NextResponse.json({ error: 'SESSION_ERROR' }, { status: 500 })
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const { type, tier, pack } = body as { type?: string; tier?: SubscriptionTier; pack?: CreditPack }

  if (type !== 'subscription' && type !== 'credits') {
    return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 })
  }

  const priceId =
    type === 'subscription'
      ? (tier ? priceMap.subscription[tier] : undefined)
      : pack
        ? priceMap.credits[pack]
        : undefined

  if (!priceId) {
    return NextResponse.json({ error: 'INVALID_PRICE' }, { status: 400 })
  }

  const baseUrl = getBaseUrl()
  const successUrl = `${baseUrl}/planos?status=success`
  const cancelUrl = `${baseUrl}/planos?status=cancel`

  const metadata: Record<string, string> = {
    user_id: session.user.id,
  }

  if (type === 'subscription' && tier) {
    metadata.plan = tier
  }

  if (type === 'credits' && pack) {
    const creditsNumber = pack === 'credits3' ? 3 : pack === 'credits10' ? 10 : 25
    metadata.credits = `${creditsNumber}`
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: type === 'subscription' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: session.user.email ?? undefined,
      metadata,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Erro ao criar checkout session:', error)
    return NextResponse.json({ error: 'CHECKOUT_ERROR' }, { status: 500 })
  }
}
