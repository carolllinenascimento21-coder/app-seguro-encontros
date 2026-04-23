# app-seguro-encontros
Projeto criado via Lasy - app-seguro-encontros

## Configuração de verificação de selfie

- Defina `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (não expor no cliente) para permitir que a API marque perfis como verificados.
- Execute as migrações do Supabase para criar o bucket privado `selfie-verifications` e aplicar as políticas de RLS que evitam atualizações diretas de `selfie_verified`.


## QA do fluxo de recuperação de senha

- Rode o smoke test de roteamento de recovery com `npm run test:auth-recovery-routing` (requer aplicação em execução no `APP_BASE_URL`, padrão `http://localhost:3000`).
- Guia de validação funcional e checklist de screenshots: `docs/auth-recovery-qa.md`.
