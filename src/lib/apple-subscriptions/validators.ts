import { z } from 'zod'

import { getPlanFromAppleProduct } from '@/lib/apple-subscriptions/catalog'
import type { AppleActivateSubscriptionRequest } from '@/lib/apple-subscriptions/types'

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'invalid_iso_date',
})

const requestSchema = z
  .object({
    productId: z.string().min(3),
    transactionId: z.string().min(1),
    originalTransactionId: z.string().min(1),
    purchaseDate: isoDateString,
    expirationDate: isoDateString.nullable(),
    environment: z.enum(['sandbox', 'production']),
    appAccountToken: z.string().uuid().nullable().optional(),
    signedTransactionInfo: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (!getPlanFromAppleProduct(value.productId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'product_id_not_allowed',
      })
    }
  })

export function parseAppleActivationBody(body: unknown): AppleActivateSubscriptionRequest {
  const parsed = requestSchema.parse(body)

  return {
    productId: parsed.productId,
    transactionId: parsed.transactionId,
    originalTransactionId: parsed.originalTransactionId,
    purchaseDate: new Date(parsed.purchaseDate).toISOString(),
    expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate).toISOString() : null,
    environment: parsed.environment,
    appAccountToken: parsed.appAccountToken ?? null,
    signedTransactionInfo: parsed.signedTransactionInfo,
  }
}
