-- Ensure optional profile columns exist for backward compatibility
alter table public.profiles
  add column if not exists telefone text,
  add column if not exists is_active boolean,
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  alter column is_active set default true;

update public.profiles
set is_active = true
where is_active is null;
