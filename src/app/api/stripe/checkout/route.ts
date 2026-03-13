import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/server"

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/perfil?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/planos`
    })

    return NextResponse.json({
      url: session.url
    })
  } catch (error) {
    console.error("stripe checkout error", error)

    return NextResponse.json(
      { error: "STRIPE_CHECKOUT_FAILED" },
      { status: 500 }
    )
  }
}
