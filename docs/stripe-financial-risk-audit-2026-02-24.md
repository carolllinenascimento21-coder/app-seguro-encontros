# Auditoria de Risco Financeiro e Consistência Stripe/Supabase

Data: 2026-02-24
Escopo: fluxo de checkout, webhook Stripe, persistência de plano/créditos e consistência entre frontend, Stripe e Supabase.

## 1) Mapeamento de arquivos e pontos críticos

### Endpoints/arquivos auditados
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/credits-checkout/route.ts`
- `src/lib/stripe.ts`
- `src/lib/billing.ts`
- `middleware.ts`
- `src/app/planos/page.tsx`
- `src/app/api/me/credits/route.ts`
- `src/app/api/me/entitlements/route.ts`
- `supabase/migrations/20250322090000_credit_transactions_and_credit_consumption.sql`
- `supabase/migrations/20250425000000_profiles_stripe_columns.sql`

### Pontos onde ocorre update de créditos
- Webhook `checkout.session.completed` (modo `payment`) chama RPC `add_profile_credits_with_transaction`.  
  Arquivo: `src/app/api/webhooks/stripe/route.ts`.
- RPC SQL incrementa `profiles.credits` com `credits = credits + credit_delta` e grava `credit_transactions`.  
  Arquivo: `supabase/migrations/20250322090000_credit_transactions_and_credit_consumption.sql`.

### Pontos onde ocorre update em `profiles` (plano/assinatura/stripe ids)
- Webhook `checkout.session.completed` (modo `subscription`) atualiza `current_plan_id`, `subscription_status`, `has_active_plan`, `stripe_customer_id`, `stripe_subscription_id`.
- Webhook `customer.subscription.created|updated|deleted` atualiza `subscription_status`, `has_active_plan`, `current_plan_id` (inclui downgrade para `free`), `stripe_customer_id`, `stripe_subscription_id`.
- Webhook `invoice.paid` atualiza `subscription_status`, `has_active_plan`, `stripe_customer_id`, `stripe_subscription_id`.

### Pontos de criação de Checkout Session
- Assinatura: `src/app/api/stripe/checkout/route.ts`.
- Créditos (one-time): `src/app/api/stripe/credits-checkout/route.ts`.
- Front dispara requisição de checkout sem trava de clique/reentrada: `src/app/planos/page.tsx`.

### Pontos de processamento de eventos Stripe
- `src/app/api/webhooks/stripe/route.ts` processa:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`

## 2) Diagnóstico por risco (produção SaaS)

| Risco | Nível | Arquivo afetado | Linha aprox. | Impacto financeiro real |
|---|---|---|---:|---|
| Webhook sem tabela de eventos processados (`stripe_events`) por `event.id` | **CRÍTICO** | `src/app/api/webhooks/stripe/route.ts` | 80-266 | Reentrega/replay de webhook pode reexecutar lógica de atualização de estado e potencialmente gerar efeitos duplicados em fluxos não blindados por chave externa. |
| Idempotência parcial apenas para créditos (via `external_reference`) e inexistente para updates de assinatura | **ALTO** | `src/app/api/webhooks/stripe/route.ts` + SQL RPC | 137-159, 187-263 + SQL 33-57 | Estados de assinatura podem oscilar/regravar em ordem não determinística; risco de concessão/revogação indevida e suporte/manual refund. |
| Falta de `idempotencyKey` em `checkout.sessions.create` (assinatura e créditos) | **ALTO** | `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/credits-checkout/route.ts` | 117-142, 46-60 | Duplo clique/retry de rede pode abrir múltiplas sessões e aumentar chance de dupla cobrança (dois checkouts completos). |
| Frontend sem lock anti-duplo-disparo ao iniciar checkout | **MÉDIO/ALTO** | `src/app/planos/page.tsx` | 23-47 | Usuária pode criar sessões em paralelo e pagar duas vezes em janela curta. |
| Criação/lookup de customer por `email` (não por `stripe_customer_id` persistido com garantia forte) | **MÉDIO** | `src/app/api/stripe/checkout/route.ts` | 99-113 | Pode haver customer duplicado por e-mail alterado/ambiente misto, gerando tracking financeiro inconsistente. |
| Possível drift de schema: código usa `stripe_subscription_id`, migration versionada não cria essa coluna | **ALTO** | `src/app/api/webhooks/stripe/route.ts`, `supabase/migrations/20250425000000_profiles_stripe_columns.sql` | 156, 225, 258 vs SQL 3-7 | Em ambientes incompletos, webhook falha em update e status de assinatura diverge de Stripe. |
| Inconsistência de fonte de créditos (`profiles.credits` vs endpoint lendo `user_credits.balance`) | **ALTO** | `src/app/api/me/credits/route.ts` + SQL de créditos | 13-24 + SQL 51-56 | Usuária pode enxergar saldo diferente do saldo real usado em regras de negócio; risco de chargeback/disputa por “créditos sumidos”. |
| `invoice.paid` e `customer.subscription.*` atualizam assinatura sem ordenação por timestamp do evento | **MÉDIO** | `src/app/api/webhooks/stripe/route.ts` | 187-263 | Evento atrasado pode sobrescrever estado mais novo (flapping de status/plano). |
| Dependência de redirect de sucesso para UX sem estado intermediário “pending webhook” | **MÉDIO** | checkout routes + front | 128-129, 50-51 + front | Usuária volta da Stripe antes do webhook; pode ver plano/crédito “não aplicado” e repetir compra. |
| Ausência de verificação de assinatura ativa antes de novo checkout de assinatura | **MÉDIO/ALTO** | `src/app/api/stripe/checkout/route.ts` | 69-144 | Usuária já ativa pode contratar novamente (nova assinatura), gerando cobrança recorrente duplicada. |

## 3) Vulnerabilidades financeiras encontradas

1. **Sem deduplicação global de webhook por `event.id`** (não existe `stripe_events` no repositório e nem guard clause por evento processado).  
2. **Sem idempotency key no create checkout session** em ambos endpoints (assinatura e crédito).  
3. **Sem trava de concorrência no frontend** para múltiplos POST de checkout.  
4. **Sem bloqueio de nova assinatura quando já há assinatura ativa** para mesma usuária.  
5. **Possível inconsistência de schema** (`stripe_subscription_id` usado no código sem migration correspondente no histórico apresentado).  
6. **Fonte de verdade de créditos divergente** (`profiles.credits` no processamento financeiro vs `user_credits.balance` para exibição).  
7. **Atualizações de assinatura sem mecanismo explícito de ordenação temporal de eventos** (risco de out-of-order overwrite).  

## 4) Blindagem recomendada (código e SQL)

### 4.1 Criar ledger de eventos Stripe com unicidade por `event_id`

```sql
create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  livemode boolean not null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  processed_at timestamp with time zone,
  payload jsonb not null,
  processing_error text
);

create unique index if not exists stripe_events_event_id_unique
  on public.stripe_events (event_id);
```

### 4.2 Guard clause de idempotência no webhook (primeiro write vence)

```ts
// após constructEvent
const { data: inserted, error: insertError } = await supabaseAdmin
  .from('stripe_events')
  .insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload: event,
  })
  .select('id')
  .single()

if (insertError) {
  // conflito de unique => já processado
  if ((insertError as any).code === '23505') {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }
  throw insertError
}

// ...processa evento...

await supabaseAdmin
  .from('stripe_events')
  .update({ processed_at: new Date().toISOString(), processing_error: null })
  .eq('id', inserted.id)
```

### 4.3 Reforçar ledger de crédito com origem forte

```sql
alter table public.credit_transactions
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists stripe_event_id text;

create unique index if not exists credit_transactions_source_unique
  on public.credit_transactions (source_type, source_id)
  where source_id is not null;
```

Aplicar crédito com:
- `source_type='checkout_session'`
- `source_id=session.id`
- `stripe_event_id=event.id`

### 4.4 Usar `idempotencyKey` na criação de checkout

```ts
import crypto from 'node:crypto'

const idem = crypto
  .createHash('sha256')
  .update(`${user.id}:${normalizedPlan}:${new Date().toISOString().slice(0,16)}`)
  .digest('hex')

await stripe.checkout.sessions.create(payload, {
  idempotencyKey: `checkout:${idem}`,
})
```

> Ideal: persistir chave por intenção de compra (UUID server-side) para ser estável em retries reais.

### 4.5 Evitar assinatura duplicada

Antes de `checkout.sessions.create` (subscription):
- buscar profile + subscription status atual;
- se já ativo, retornar 409 com instrução para gerenciar assinatura existente.

### 4.6 Controle de corrida checkout↔webhook

- Não conceder acesso por query param de sucesso.
- Ao retornar da Stripe, exibir estado `pending_confirmation`.
- Fazer polling curto em `/api/me/entitlements` até refletir webhook (ex.: 30-60s, backoff).

### 4.7 Drift TEST vs LIVE

- Persistir e validar `livemode` em `stripe_events`.
- Rejeitar evento quando `event.livemode` não bate com ambiente da app.
- Adicionar healthcheck que valida coerência entre `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e price IDs (test/live prefix expected).

## 5) Checklist final de robustez SaaS (recorrente + one-time)

- [ ] Webhook verifica assinatura com `req.text()` + `stripe-signature`.
- [ ] Todo webhook é deduplicado por `event.id` (tabela `stripe_events`).
- [ ] Fluxo de crédito tem ledger e unique por origem (`source_type`, `source_id`).
- [ ] `checkout.sessions.create` usa `idempotencyKey`.
- [ ] Endpoint de assinatura bloqueia nova compra com assinatura já ativa.
- [ ] Atualização de plano/status depende de webhook (não de redirect/front).
- [ ] Front tem estado intermediário “aguardando confirmação de pagamento”.
- [ ] Há reconciliação diária Stripe↔Supabase (assinaturas ativas, créditos vendidos/aplicados).
- [ ] Ambiente Stripe test/live validado automaticamente em runtime.
- [ ] Colunas críticas de perfil (`stripe_customer_id`, `stripe_subscription_id`) têm migration versionada e índice/constraint coerentes.

## 6) Conclusão executiva

O projeto já tem **boa base para créditos** (ledger e unique por referência externa), porém ainda possui lacunas significativas para padrão SaaS financeiro de produção: **idempotência global de webhook, idempotency key no checkout, prevenção de assinaturas duplicadas e reconciliação de consistência**.

Sem esses controles, o risco predominante não é apenas “crédito duplicado”, mas também **dupla cobrança e divergência Stripe↔Supabase**, com impacto direto em receita líquida (refunds/chargebacks), suporte e confiança.
