# Arquitetura final de créditos

## Fluxo financeiro

1. Stripe finaliza `checkout.session.completed` no modo `payment`.
2. Webhook valida assinatura Stripe (`stripe-signature`) com corpo raw (`req.text()`).
3. Webhook faz dedupe por `event.id` via `public.stripe_events`.
4. Apenas com `payment_status = paid`, webhook chama RPC `public.add_profile_credits_with_transaction`.
5. RPC escreve no ledger `public.credit_transactions` primeiro, com idempotência por `external_reference`.
6. Se a transação já existir, RPC retorna sem creditar novamente.
7. Em caso novo, RPC garante linha em `public.user_credits` e incrementa `public.user_credits.balance`.
8. UI lê saldo somente de `public.user_credits.balance` via `/api/me/credits`.

## Fonte de verdade

- **Saldo atual**: `public.user_credits.balance`.
- **Ledger/auditoria**: `public.credit_transactions`.
- **Idempotência de webhook**: `public.stripe_events(event_id)`.
- `profiles.credits` não participa do fluxo financeiro.

## Cenário de retry do Stripe

Quando Stripe reenvia o mesmo evento:

1. `insert` em `stripe_events` falha por PK duplicada (`event_id`).
2. Webhook retorna sucesso sem reprocessar regra de negócio.

Se houver reprocessamento por outra origem com mesma referência externa:

1. RPC tenta inserir em `credit_transactions` com `external_reference`.
2. `on conflict do nothing` impede nova linha no ledger.
3. RPC encerra sem atualizar `user_credits.balance`.

Esse desenho garante consistência financeira determinística e evita crédito duplicado.
