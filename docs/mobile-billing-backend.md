# Mobile Billing Backend (Apple + Google)

## Fonte de verdade
- Assinaturas mobile são validadas server-side direto na Apple/Google.
- `public.billing_subscriptions` é espelho derivado para estado atual.
- `public.billing_events` é trilha auditável e idempotente.

## Endpoints
- `POST /api/billing/apple/validate`
- `POST /api/billing/google/validate`
- `POST /api/billing/apple/notifications`
- `POST /api/billing/google/notifications`
- `POST /api/billing/restore`
- Compatibilidade legada: `POST /api/mobile/validate-purchase`

## Exemplo payloads

### Apple validate
```json
{
  "platform": "apple",
  "productId": "br.com.wpssistemas.confiamais.premium.monthly",
  "transactionId": "2000001234567890",
  "originalTransactionId": "2000001234567000",
  "appAccountToken": "<uuid-do-usuario>",
  "signedTransactionInfo": "<jws-opcional-do-client>"
}
```

### Google validate
```json
{
  "platform": "google",
  "productId": "br.com.wpssistemas.confiamais.premium.annual",
  "purchaseToken": "token-do-google-play",
  "orderId": "GPA.1234-5678-9012-34567",
  "packageName": "br.com.wpssistemas.confiamais"
}
```

### Restore
```json
{
  "purchases": [
    {
      "platform": "apple",
      "productId": "br.com.wpssistemas.confiamais.premium.monthly",
      "transactionId": "2000001234567890"
    },
    {
      "platform": "google",
      "productId": "br.com.wpssistemas.confiamais.premium.annual",
      "purchaseToken": "token-do-google-play",
      "packageName": "br.com.wpssistemas.confiamais"
    }
  ]
}
```
