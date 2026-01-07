-- Ensure telefone exists and stays nullable for retrocompatibility
alter table public.profiles
  add column if not exists telefone text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'telefone'
  ) then
    alter table public.profiles
      alter column telefone drop not null,
      alter column telefone drop default;
  end if;
end $$;

-- Backfill profiles for legacy users without profiles
insert into public.profiles (id, nome, telefone, onboarding_completed)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'name', 'Usuário') as nome,
  users.raw_user_meta_data->>'phone' as telefone,
  false as onboarding_completed
from auth.users as users
left join public.profiles as profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

-- RLS policies for profile ownership
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
