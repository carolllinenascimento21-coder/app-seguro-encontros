-- Add gender, selfie and onboarding controls if missing
alter table public.profiles
  add column if not exists gender text not null default 'female';

alter table public.profiles
  add column if not exists selfie_verified boolean not null default false;

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  alter column gender set default 'female';

alter table public.profiles
  alter column gender set not null;

alter table public.profiles
  alter column selfie_verified set default false;

alter table public.profiles
  alter column selfie_verified set not null;

alter table public.profiles
  alter column onboarding_completed set default false;

alter table public.profiles
  alter column onboarding_completed set not null;

-- Normalize existing gender values
update public.profiles
  set gender = 'female'
  where gender is null or trim(gender) = '';

-- Enforce female gender constraint
alter table public.profiles drop constraint if exists profiles_gender_female_check;
alter table public.profiles
  add constraint profiles_gender_female_check check (lower(gender) = 'female');

-- Recreate handle_new_user to rely on raw_user_meta_data and preserve data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_gender text;
  incoming_nome text;
  incoming_selfie boolean;
  incoming_onboarding boolean;
begin
  normalized_gender := coalesce(nullif(lower(new.raw_user_meta_data->>'gender'), ''), 'female');
  incoming_nome := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), new.email);
  incoming_selfie := coalesce((new.raw_user_meta_data->>'selfie_verified')::boolean, false);
  incoming_onboarding := coalesce((new.raw_user_meta_data->>'onboarding_completed')::boolean, false);

  insert into public.profiles (
    id,
    email,
    nome,
    gender,
    selfie_verified,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    incoming_nome,
    normalized_gender,
    incoming_selfie,
    incoming_onboarding
  )
  on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.profiles.nome, excluded.nome),
        gender = coalesce(public.profiles.gender, excluded.gender, 'female'),
        selfie_verified = coalesce(public.profiles.selfie_verified, excluded.selfie_verified, false),
        onboarding_completed = coalesce(public.profiles.onboarding_completed, excluded.onboarding_completed, false);

  return new;
end;
$$;

-- Recreate trigger to call the new function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Apply strict RLS policies for female users awaiting selfie verification
alter table public.profiles enable row level security;

drop policy if exists "Profile owners can read their data" on public.profiles;
drop policy if exists "Profile owners can insert their data" on public.profiles;
drop policy if exists "Profile owners update their data" on public.profiles;

do $$
begin
  create policy "Profile owners can read their data" on public.profiles
    for select using (
      auth.uid() = id
      and lower(gender) = 'female'
    );
end $$;

do $$
begin
  create policy "Profile owners can insert their data" on public.profiles
    for insert
    with check (
      auth.uid() = id
      and lower(gender) = 'female'
      and coalesce(selfie_verified, false) = false
    );
end $$;

do $$
begin
  create policy "Profile owners update their data" on public.profiles
    for update
    using (
      auth.uid() = id
      and lower(gender) = 'female'
    )
    with check (
      auth.uid() = id
      and lower(gender) = 'female'
      and coalesce(selfie_verified, false) = coalesce((select selfie_verified from public.profiles p where p.id = auth.uid()), false)
      and coalesce(onboarding_completed, false) = coalesce((select onboarding_completed from public.profiles p where p.id = auth.uid()), false)
    );
end $$;
