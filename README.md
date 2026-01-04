# app-seguro-encontros
Projeto criado via Lasy - app-seguro-encontros

## Configuração de verificação de selfie

- Defina `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (não expor no cliente) para permitir que a API marque perfis como verificados.
- Execute as migrações do Supabase para criar o bucket privado `selfie-verifications` e aplicar as políticas de RLS que evitam atualizações diretas de `selfie_verified`.

## Monetização (freemium)

- Execute as migrações em `supabase/migrations/20250301000000_freemium_paywall.sql` para criar colunas de plano/créditos e a tabela `consultas`.
- Variáveis de ambiente necessárias:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_PLUS`
  - `STRIPE_PRICE_CREDITS_3`, `STRIPE_PRICE_CREDITS_10`, `STRIPE_PRICE_CREDITS_25`
  - `STRIPE_REDIRECT_BASE_URL` (ou `NEXT_PUBLIC_SITE_URL`) para montar os links de sucesso/cancelamento.
