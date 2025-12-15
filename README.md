# app-seguro-encontros
Projeto criado via Lasy - app-seguro-encontros

## Configuração de verificação de selfie

- Defina `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (não expor no cliente) para permitir que a API marque perfis como verificados.
- Execute as migrações do Supabase para criar o bucket privado `selfie-verifications` e aplicar as políticas de RLS que evitam atualizações diretas de `selfie_verified`.
