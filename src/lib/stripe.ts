import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('Missing STRIPE_SECRET_KEY environment variable')
    return null
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    })
  }

  return stripeClient
}
