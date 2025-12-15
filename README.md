# app-seguro-encontros
Projeto criado via Lasy - app-seguro-encontros

## Configuração de verificação de selfie

- Defina `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (não expor no cliente) para permitir que a API marque perfis como verificados.
- Execute as migrações do Supabase para criar o bucket privado `selfie-verifications` e aplicar as políticas de RLS que evitam atualizações diretas de `selfie_verified`.

## Validando as migrações no Supabase Dashboard

1. Acesse o Supabase Dashboard e abra **Database > Migrations** para confirmar que a migração `202405070004_ensure_profiles_email_unique.sql` foi aplicada.
2. No **SQL Editor**, rode a consulta abaixo para verificar a existência da coluna e da constraint de unicidade:
   ```sql
   select
     column_name,
     is_nullable
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'profiles'
     and column_name = 'email';

   select conname
   from pg_constraint
   where conname = 'profiles_email_key';
   ```
3. Na aba **Table editor**, abra `public.profiles` e confirme que linhas existentes têm a coluna `email` preenchida (backfill a partir de `auth.users`).
