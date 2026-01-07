-- Ensure legacy profile columns exist for retrocompatibility
alter table public.profiles
  add column if not exists telefone text,
  add column if not exists is_active boolean default true,
  add column if not exists deleted_at timestamp;

alter table public.profiles
  alter column is_active set default true;
