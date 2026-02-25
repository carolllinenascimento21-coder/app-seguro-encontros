# Confia+ Stripe/Supabase Runbook de Deploy Seguro (Produção)

## 1) Pré-deploy checklist

- [ ] Migrations aplicadas **antes** do deploy da Vercel.
  - [ ] `public.stripe_events` (dedupe por `event.id`).
  - [ ] `public.profiles.stripe_subscription_id` + índice.
- [ ] Variáveis de ambiente em produção (Vercel):
  - [ ] `STRIPE_SECRET_KEY` (LIVE, começa com `sk_live_`).
  - [ ] `STRIPE_WEBHOOK_SECRET` (LIVE, endpoint real publicado).
  - [ ] `STRIPE_PRICE_CREDITS_3`, `STRIPE_PRICE_CREDITS_10`, `STRIPE_PRICE_CREDITS_25`.
  - [ ] `STRIPE_PRICE_PREMIUM_MONTHLY` e `STRIPE_PRICE_PREMIUM_YEARLY` (ou aliases configurados no código).
  - [ ] `SITE_URL`/`NEXT_PUBLIC_SITE_URL` com domínio final público.
- [ ] Endpoint de webhook no Stripe Dashboard aponta para URL de produção sem redirects.

## 2) Ordem de deploy sem downtime

1. Aplicar migrations SQL no Supabase (produção).
2. Validar schema:
   ```sql
   select column_name
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'profiles'
     and column_name = 'stripe_subscription_id';

   select to_regclass('public.stripe_events');
   ```
3. Deploy Vercel (branch principal).
4. Confirmar webhook ativo no Stripe Dashboard.

## 3) Smoke tests pós-deploy

### 3.1 Webhook

- Teste de acesso:
  ```bash
  curl -i https://SEU_DOMINIO/api/webhooks/stripe
  ```
  Esperado: 400/405 sem redirect para outra rota.

### 3.2 Assinatura

1. Executar checkout de assinatura com usuário de teste.
2. Validar em banco:
   ```sql
   select id, stripe_customer_id, stripe_subscription_id, has_active_plan, subscription_status, current_plan_id
   from public.profiles
   where id = '<USER_ID>';
   ```

### 3.3 Créditos

1. Comprar pacote de créditos.
2. Validar ledger e saldo:
   ```sql
   select credits from public.profiles where id = '<USER_ID>';

   select id, user_id, type, amount, external_reference, created_at
   from public.credit_transactions
   where user_id = '<USER_ID>'
   order by created_at desc
   limit 20;
   ```

## 4) Teste de retry/idempotência (Stripe CLI)

1. Escutar e encaminhar para ambiente alvo:
   ```bash
   stripe listen --forward-to https://SEU_DOMINIO/api/webhooks/stripe
   ```
2. Gerar evento de checkout concluído:
   ```bash
   stripe trigger checkout.session.completed
   ```
3. Capturar `event_id` (ex.: `evt_123`) nos logs da CLI.
4. Reenviar o mesmo evento:
   ```bash
   stripe events resend evt_123 --webhook-endpoint=<WEBHOOK_ENDPOINT_ID>
   ```
5. Validar pass/fail:
   - **PASS**: webhook retorna 200 no replay e não duplica efeitos.
   - **PASS**: tabela `stripe_events` mantém uma linha por `event_id`.
   - **PASS**: ledger de créditos não duplica `external_reference`.

SQL de validação:
```sql
select * from public.stripe_events where event_id = 'evt_123';

select external_reference, count(*)
from public.credit_transactions
where external_reference in ('<payment_intent_ou_session_id>')
group by external_reference;
```

## 5) Rollback

1. **Código**: rollback no Vercel para o deployment anterior estável.
2. **Webhook**: se houver erro severo, desativar temporariamente endpoint no Stripe Dashboard para conter reprocessamento.
3. **Banco**:
   - Migrations adicionadas (`stripe_events`, `stripe_subscription_id`) são backward-compatible, não precisam rollback imediato.
   - Se necessário, corrigir dados manualmente com script SQL de reconciliação (subscriptions e créditos).
4. **Reconciliação financeira**:
   - Comparar Stripe payments/sessions com `credit_transactions` e `profiles.credits`.
   - Reaplicar créditos faltantes via RPC com `external_reference` estável.
