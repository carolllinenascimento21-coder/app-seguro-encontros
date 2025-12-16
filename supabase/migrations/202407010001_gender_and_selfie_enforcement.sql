-- Add gender and reinforce selfie verification defaults
alter table public.profiles
  add column if not exists gender text;

update public.profiles
  set gender = coalesce(nullif(gender, ''), 'female');

alter table public.profiles
  alter column gender set default 'female';

alter table public.profiles
  alter column gender set not null;

alter table public.profiles
  alter column selfie_verified set default false;

alter table public.profiles
  alter column selfie_verified set not null;

alter table public.profiles
  drop constraint if exists profiles_gender_female_check;

alter table public.profiles
  add constraint profiles_gender_female_check check (lower(gender) = 'female');

-- Ensure a consistent profile is created for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_gender text;
begin
  normalized_gender := coalesce(nullif(lower(new.raw_user_meta_data->>'gender'), ''), 'female');

  insert into public.profiles (id, email, name, gender, selfie_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    normalized_gender,
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        gender = excluded.gender,
        selfie_verified = coalesce(public.profiles.selfie_verified, false);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Harden profile access so only owners can interact with their data
alter table public.profiles enable row level security;

drop policy if exists "Profile owners can read" on public.profiles;
drop policy if exists "Profile owners can insert their row" on public.profiles;
drop policy if exists "Profile owners update without selfie flags" on public.profiles;

do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'Profile owners can read their data' and tablename = 'profiles'
  ) then
    create policy "Profile owners can read their data" on public.profiles
      for select using (auth.uid() = id and lower(gender) = 'female');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'Profile owners can insert their data' and tablename = 'profiles'
  ) then
    create policy "Profile owners can insert their data" on public.profiles
      for insert
      with check (
        auth.uid() = id
        and lower(gender) = 'female'
        and coalesce(selfie_verified, false) = false
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'Profile owners update their data' and tablename = 'profiles'
  ) then
    create policy "Profile owners update their data" on public.profiles
      for update
      using (auth.uid() = id)
      with check (
        auth.uid() = id
        and lower(gender) = 'female'
        and coalesce(selfie_verified, false) = coalesce((select selfie_verified from public.profiles p where p.id = auth.uid()), false)
      );
  end if;
end $$;
