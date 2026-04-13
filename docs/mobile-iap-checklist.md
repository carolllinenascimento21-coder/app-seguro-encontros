# Confia+ Mobile IAP (Apple + Google) — Checklist de produção

## 1) Produtos oficiais nas lojas

- [ ] **Apple App Store Connect**
  - [ ] Subscription mensal criada com Product ID: `br.com.wpssistemas.confiamais.premium.monthly`
  - [ ] Subscription anual criada com Product ID: `br.com.wpssistemas.confiamais.premium.annual`
  - [ ] Grupo de assinatura configurado para permitir upgrade/downgrade

- [ ] **Google Play Console**
  - [ ] Subscription mensal criada com Product ID: `br.com.wpssistemas.confiamais.premium.monthly`
  - [ ] Subscription anual criada com Product ID: `br.com.wpssistemas.confiamais.premium.annual`
  - [ ] Base plans e offers ativas para testes internos

## 2) Variáveis de ambiente (backend Next.js)

### Apple (App Store Server API)

- `APPLE_IAP_ISSUER_ID`
- `APPLE_IAP_KEY_ID`
- `APPLE_IAP_PRIVATE_KEY`
- `APPLE_BUNDLE_ID`

> `APPLE_IAP_PRIVATE_KEY` deve ser salvo em formato PEM e com quebras de linha escapadas (`\n`) quando necessário.

### Google Play Developer API

- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_PLAY_PACKAGE_NAME` (default no código: `br.com.wpssistemas.confiamais`)

> `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY` também deve usar PEM com `\n` quando armazenado em secret manager.

## 3) Fluxo de compra implementado

- [ ] `/planos` detecta ambiente mobile via `window.confiaStoreKit`
- [ ] Mobile usa `window.confiaStoreKit.purchase(productId)`
- [ ] Web continua usando `/api/stripe/checkout`
- [ ] Backend valida compra em `/api/mobile/validate-purchase`
- [ ] Mapeamento obrigatório:
  - `br.com.wpssistemas.confiamais.premium.monthly` → `premium_monthly`
  - `br.com.wpssistemas.confiamais.premium.annual` → `premium_yearly`
- [ ] Após validação: atualizar `profiles.current_plan_id`, `subscription_status='active'`, `has_active_plan=true`

## 4) Testes de sandbox

### Apple sandbox

- [ ] Usuária tester Apple configurada
- [ ] Compra mensal e anual concluindo sem erro
- [ ] Backend retorna `ok: true` em `/api/mobile/validate-purchase`
- [ ] Perfil atualizado com plano correto

### Google internal test

- [ ] Usuária de teste adicionada em track interno
- [ ] Compra mensal e anual concluindo sem erro
- [ ] Backend valida `purchaseToken` na API do Google
- [ ] Perfil atualizado com plano correto

## 5) Restore de compras

- [ ] Botão **Restaurar compras** disponível apenas no app mobile
- [ ] App chama `window.confiaStoreKit.restorePurchases()`
- [ ] Resultado é enviado para `/api/mobile/validate-purchase`
- [ ] Backend revalida em Apple/Google e reaplica plano ativo no perfil

## 6) Regressão Web/Stripe

- [ ] Endpoint `/api/stripe/checkout` continua funcionando
- [ ] Webhook `/api/webhooks/stripe` intacto
- [ ] Assinatura web segue fluxo atual sem alteração de arquitetura
