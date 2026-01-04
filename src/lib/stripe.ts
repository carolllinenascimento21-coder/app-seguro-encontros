import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing Stripe secret key environment variable')
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18',
})
