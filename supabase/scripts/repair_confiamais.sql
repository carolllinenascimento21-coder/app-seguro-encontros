-- Repair script (idempotente) para restaurar objetos esperados pelo app Confia+
-- Execute no Supabase SQL Editor do projeto correto.

begin;

-- =====================================================
-- 1) Estruturas mínimas usadas pelo app (quando ausentes)
-- =====================================================

create table if not exists public.emergency_contacts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contatos_emergencia (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.male_profiles (
  id bigserial primary key,
  display_name text not null,
  normalized_name text,
  city text,
  normalized_city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 2) Compatibilidade entre tabelas de contato (PT/EN)
-- =====================================================

insert into public.emergency_contacts (user_id, nome, telefone, created_at)
select c.user_id, c.nome, c.telefone, c.created_at
from public.contatos_emergencia c
left join public.emergency_contacts e
  on e.user_id = c.user_id and e.nome = c.nome and e.telefone = c.telefone
where e.id is null;

insert into public.contatos_emergencia (user_id, nome, telefone, created_at)
select e.user_id, e.nome, e.telefone, e.created_at
from public.emergency_contacts e
left join public.contatos_emergencia c
  on c.user_id = e.user_id and c.nome = e.nome and c.telefone = e.telefone
where c.id is null;

-- =====================================================
-- 3) Trigger de criação automática de profile
-- =====================================================

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone, onboarding_completed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(coalesce(new.email, ''), '@', 1), 'Usuária'),
    coalesce(new.raw_user_meta_data->>'telefone', ''),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- =====================================================
-- 4) Backfill de profiles ausentes
-- =====================================================

insert into public.profiles (id, nome, telefone, onboarding_completed)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nome', split_part(coalesce(u.email, ''), '@', 1), 'Usuária'),
  coalesce(u.raw_user_meta_data->>'telefone', ''),
  false
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Verificação rápida (resultado esperado = 0)
-- select count(*) as users_sem_profile
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;

-- =====================================================
-- 5) RLS mínima para tabelas usadas no frontend
-- =====================================================

alter table public.emergency_contacts enable row level security;
alter table public.contatos_emergencia enable row level security;
alter table public.analytics_events enable row level security;
alter table public.user_credits enable row level security;

-- emergency_contacts
 drop policy if exists "owner_select_emergency_contacts" on public.emergency_contacts;
create policy "owner_select_emergency_contacts"
  on public.emergency_contacts for select
  using (auth.uid() = user_id);

 drop policy if exists "owner_insert_emergency_contacts" on public.emergency_contacts;
create policy "owner_insert_emergency_contacts"
  on public.emergency_contacts for insert
  with check (auth.uid() = user_id);

 drop policy if exists "owner_update_emergency_contacts" on public.emergency_contacts;
create policy "owner_update_emergency_contacts"
  on public.emergency_contacts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

 drop policy if exists "owner_delete_emergency_contacts" on public.emergency_contacts;
create policy "owner_delete_emergency_contacts"
  on public.emergency_contacts for delete
  using (auth.uid() = user_id);

-- contatos_emergencia
 drop policy if exists "owner_select_contatos_emergencia" on public.contatos_emergencia;
create policy "owner_select_contatos_emergencia"
  on public.contatos_emergencia for select
  using (auth.uid() = user_id);

 drop policy if exists "owner_insert_contatos_emergencia" on public.contatos_emergencia;
create policy "owner_insert_contatos_emergencia"
  on public.contatos_emergencia for insert
  with check (auth.uid() = user_id);

 drop policy if exists "owner_update_contatos_emergencia" on public.contatos_emergencia;
create policy "owner_update_contatos_emergencia"
  on public.contatos_emergencia for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

 drop policy if exists "owner_delete_contatos_emergencia" on public.contatos_emergencia;
create policy "owner_delete_contatos_emergencia"
  on public.contatos_emergencia for delete
  using (auth.uid() = user_id);

-- user_credits
 drop policy if exists "owner_select_user_credits" on public.user_credits;
create policy "owner_select_user_credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- analytics_events (somente service_role escreve)
 drop policy if exists "service_role_insert_analytics_events" on public.analytics_events;
create policy "service_role_insert_analytics_events"
  on public.analytics_events for insert
  to service_role
  with check (true);

-- male_profiles e avaliados tendem a ser públicas para busca
alter table if exists public.male_profiles enable row level security;
 drop policy if exists "public_read_male_profiles" on public.male_profiles;
create policy "public_read_male_profiles"
  on public.male_profiles for select
  using (is_active = true);

alter table if exists public.avaliados enable row level security;
 drop policy if exists "public_read_avaliados" on public.avaliados;
create policy "public_read_avaliados"
  on public.avaliados for select
  using (true);

-- =====================================================
-- 6) Buckets esperados
-- =====================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('selfie-verifications', 'selfie-verifications', false)
on conflict (id) do nothing;

commit;

-- =====================================================
-- CONSULTAS DE AUDITORIA (executar após script)
-- =====================================================

-- Tabelas usadas no app
-- select tablename
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in (
--     'profiles','avaliacoes','avaliados','male_profiles','consultas','user_credits',
--     'plans','analytics_events','emergency_contacts','contatos_emergencia','historico_avaliacoes'
--   )
-- order by 1;

-- Policies
-- select schemaname, tablename, policyname, permissive, roles, cmd
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'profiles','avaliacoes','avaliados','male_profiles','consultas','user_credits',
--     'plans','analytics_events','emergency_contacts','contatos_emergencia','historico_avaliacoes'
--   )
-- order by tablename, policyname;

-- Trigger de profile
-- select trigger_name, event_object_table, action_timing, event_manipulation
-- from information_schema.triggers
-- where trigger_schema = 'auth'
--    or trigger_name = 'on_auth_user_created';

-- Usuários sem profile
-- select count(*) as users_sem_profile
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;
