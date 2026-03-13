import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: Request) {
  try {

    const supabase = await createServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({}, { status: 401 })
    }

    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'priceId obrigatório' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/perfil?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/planos?checkout=cancel`,
      metadata: {
        user_id: user.id
      }
    })

    return NextResponse.json({
      url: session.url
    })

  } catch (error) {

    console.error('stripe checkout error', error)

    return NextResponse.json(
      { error: 'Erro ao criar checkout' },
      { status: 500 }
    )
  }
}
