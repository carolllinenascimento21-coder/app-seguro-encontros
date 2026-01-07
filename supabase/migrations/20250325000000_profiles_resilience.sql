-- Ensure required profile columns exist for legacy accounts
alter table public.profiles
  add column if not exists nome text,
  add column if not exists telefone text,
  add column if not exists selfie_url text,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists selfie_verified boolean default false;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column selfie_verified set default false;

-- Ensure RLS policies support profile ownership
alter table public.profiles enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
drop policy if exists "Profiles can insert own profile" on public.profiles;
drop policy if exists "Profiles can update own profile" on public.profiles;

create policy "Profiles can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Profiles can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
