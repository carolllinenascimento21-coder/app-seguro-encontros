# Google OAuth em WebView (`403 disallowed_useragent`)

## Resumo

O erro `403 disallowed_useragent` ocorre quando o fluxo OAuth do Google é aberto dentro de um WebView embutido.  
Isso é uma política do Google e **não é corrigido apenas com configuração no Supabase/Next.js**.

## O que precisa ser feito

1. **No app container (Android/iOS), abrir o login em navegador do sistema**:
   - Android: Chrome Custom Tabs.
   - iOS: `ASWebAuthenticationSession` (ou `SFSafariViewController` quando aplicável).
2. **Receber callback por deep link** (`confiamais://auth/callback`) no app.
3. **No Google Cloud Console**, manter os redirect URIs corretos (web + mobile/deep link intermediado pelo backend).

## O que já está tratado neste projeto

- Endpoint dedicado para iniciar Google OAuth com callback seguro: `GET /api/auth/google`.
- Validação de callback mobile permitido (`confiamais://auth/callback`) antes de iniciar OAuth.
- Suporte a parâmetros explícitos de fluxo app (`return_mode=app`, `return_to`, `flow_id`, `nonce`) para finalizar no deep link mobile após callback.

## Checklist de configuração

- Google Cloud Console:
  - OAuth consent screen publicado.
  - Authorized redirect URI com `https://<seu-dominio>/auth/callback`.
- Supabase Auth:
  - Provider Google habilitado.
  - Redirect URLs contendo domínio web e callback usado no fluxo.
- App mobile:
  - Scheme/deep link registrado (`confiamais`).
  - Fluxo OAuth aberto com browser de sistema (não WebView).

## Importante

Se o app continuar carregando a aplicação web dentro de WebView para autenticar Google, o bloqueio pode persistir mesmo com todos os redirects corretos.

## Bridge web após login no app (opcional)

Se o login for concluído no app nativo e você precisar abrir a experiência web já autenticada, use:

`/auth/app/bridge?access_token=<token>&refresh_token=<token>&next=/home`

Essa rota sincroniza a sessão web via `/api/auth/login` no contexto do navegador e redireciona para `next`.
