-- Fix publicação de avaliações e busca por nome/cidade via male_profiles
-- OBS: normalized_name e normalized_city são colunas GENERATED no banco de produção.
-- Esta migration não deve tentar criar/recriar essas colunas nem atualizar seus valores diretamente.
begin;

-- 1) Garantir apenas colunas seguras que não conflitam com generated columns
alter table public.male_profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2) Chave única para idempotência (create/reuse)
create unique index if not exists male_profiles_normalized_unique
  on public.male_profiles (normalized_name, normalized_city);

-- 3) Índices de performance para busca por nome/cidade (ILIKE)
create extension if not exists pg_trgm;

create index if not exists male_profiles_normalized_name_trgm_idx
  on public.male_profiles using gin (normalized_name gin_trgm_ops);

create index if not exists male_profiles_normalized_city_trgm_idx
  on public.male_profiles using gin (normalized_city gin_trgm_ops);

create index if not exists male_profiles_is_active_idx
  on public.male_profiles (is_active);

create index if not exists avaliacoes_male_profile_publica_idx
  on public.avaliacoes (male_profile_id, publica);

-- 4) RLS: leitura pública para reputação, escrita administrativa via service_role
alter table public.male_profiles enable row level security;

-- remove políticas legadas conflitantes
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'male_profiles'
  LOOP
    EXECUTE format('drop policy if exists %I on public.male_profiles', p.policyname);
  END LOOP;
END $$;

create policy "male_profiles public read active"
  on public.male_profiles
  for select
  using (is_active = true);

create policy "male_profiles service role insert"
  on public.male_profiles
  for insert
  to service_role
  with check (true);

create policy "male_profiles service role update"
  on public.male_profiles
  for update
  to service_role
  using (true)
  with check (true);

commit;
