-- Emergency alerts production hardening: logging + cooldown + optional push metadata.

begin;

alter table if exists public.profiles
  add column if not exists last_alert_at timestamptz;

create table if not exists public.emergency_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  contacts_count integer not null default 0,
  channels_used text[] not null default '{}',
  status text not null check (status in ('success', 'fail'))
);

create index if not exists emergency_logs_user_id_created_at_idx
  on public.emergency_logs (user_id, created_at desc);

alter table public.emergency_logs enable row level security;

drop policy if exists "owner_select_emergency_logs" on public.emergency_logs;
create policy "owner_select_emergency_logs"
  on public.emergency_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "service_role_insert_emergency_logs" on public.emergency_logs;
create policy "service_role_insert_emergency_logs"
  on public.emergency_logs
  for insert
  to service_role
  with check (true);

alter table if exists public.emergency_contacts
  add column if not exists ativo boolean not null default true;

alter table if exists public.emergency_contacts
  add column if not exists push_token text;

alter table if exists public.emergency_contacts
  add column if not exists push_platform text
  check (push_platform in ('android', 'ios'));

commit;
