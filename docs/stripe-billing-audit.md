# Auditoria técnica — Stripe + ativação de plano

## Escopo auditado (arquivos)

- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/credits-checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/stripe.ts`
- `src/lib/billing.ts`
- `src/app/planos/page.tsx`
- `src/app/checkout/CheckoutClient.tsx`
- `src/lib/permissions.ts`
- `src/app/api/me/entitlements/route.ts`
- `middleware.ts`

## Diagnóstico principal

### 1) Quebra no início do checkout da tela de planos
A página `planos` enviava `priceId` para `/api/stripe/checkout`, mas o endpoint espera `planId` normalizado (`premium_monthly`, `premium_yearly`, `premium_plus`).

**Impacto:** o endpoint respondia `400 Plano inválido` e o fluxo não avançava para Stripe Checkout.

### 2) Inconsistência de variáveis de ambiente de preços
No projeto havia dois padrões de env vars para mensal/anual:

- `STRIPE_PRICE_PREMIUM_MONTHLY` / `STRIPE_PRICE_PREMIUM_YEARLY`
- `STRIPE_PRICE_PREMIUM_MENSAL` / `STRIPE_PRICE_PREMIUM_ANUAL`

**Impacto:** dependendo do ambiente configurado, o checkout poderia falhar por "Preço não configurado".

### 3) Cobertura incompleta de eventos de webhook
O webhook tratava apenas:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Não havia tratamento para:

- `invoice.paid`
- `customer.subscription.created`

**Impacto:** status/plano pode não ser reconciliado em todos os cenários de lifecycle de assinatura.

## Validação de IDs oficiais (conforme código)

### Assinaturas
- `price_1Ssre07IHHkQsIacWeLkInUG` (Confia+ Mensal)
- `price_1SssHT7IHHkQsIackFlCofn6` (Premium Plus Mensal)
- `price_1St4jv7IHHkQsIac8a8yKmJb` (Premium Anual)

### Créditos avulsos
- `price_1Sv4xr7IHHkQsIacMx3fvNx5` (3)
- `price_1Sv5Bu7IHHkQsIactQqeH4QO` (10)
- `price_1Sv5EK7IHHkQsIacjgZYWIBr` (25)

## Correções aplicadas

1. **Fluxo de checkout da página `planos` corrigido** para enviar `planId`/`packId` para endpoints corretos.
2. **Endpoint de assinatura** com fallback seguro para env vars mensal/anual em ambos formatos.
3. **Endpoint de créditos** agora valida cliente Stripe configurado antes de criar sessão.
4. **Webhook robustecido**:
   - valida ausência de `STRIPE_SECRET_KEY`
   - loga assinatura inválida com erro
   - inclui eventos `invoice.paid` e `customer.subscription.created`
   - mantém retorno 200 para eventos não mapeáveis por usuário (evita retries infinitos)

## Fluxo esperado após correção

1. Clique em plano/pacote na página `/planos`.
2. Front chama endpoint correto:
   - Assinatura: `/api/stripe/checkout` com `{ planId }`
   - Créditos: `/api/stripe/credits-checkout` com `{ packId }`
3. Stripe Checkout abre com sessão válida.
4. Pagamento concluído.
5. Webhook processa evento e atualiza `profiles` (`current_plan_id`, `subscription_status`, `has_active_plan`, `stripe_customer_id`, `stripe_subscription_id`).
6. Front consome estado atualizado via APIs de entitlements/perfil.

## Logs esperados após correção

- `[stripe-webhook] Evento ignorado: <evento>` para eventos fora da lista tratada.
- `[stripe-webhook] Assinatura inválida: ...` quando header/secret estiverem incorretos.
- Atualizações em `profiles` sem erro para eventos válidos (`checkout.session.completed`, `invoice.paid`, `customer.subscription.*`).

## Checklist operacional (produção)

- [ ] `STRIPE_SECRET_KEY` do mesmo modo (test/live) dos `price_*` configurados.
- [ ] `STRIPE_WEBHOOK_SECRET` da endpoint ativa na Vercel.
- [ ] Endpoint Stripe webhook sem redirect (sem 307/308).
- [ ] Eventos habilitados no dashboard: `checkout.session.completed`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] `profiles` possui colunas: `current_plan_id`, `subscription_status`, `has_active_plan`, `stripe_customer_id`, `stripe_subscription_id`.
- [ ] Função RPC de créditos (`add_profile_credits_with_transaction`) operacional.
- [ ] Rodar `scripts/stripe-webhook-smoke.sh` para smoke test de eventos.
