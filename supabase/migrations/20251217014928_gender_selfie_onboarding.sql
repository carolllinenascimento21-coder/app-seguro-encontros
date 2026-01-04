-- ensure profiles table exists with appropriate defaults and constraints
-- note: adjust column name 'nome' to match your schema
alter table public.profiles
  add column if not exists gender text;
alter table public.profiles
  add column if not exists selfie_verified boolean;
alter table public.profiles
  add column if not exists onboarding_completed boolean;

-- set defaults and constraints
alter table public.profiles alter column gender set default 'female';
update public.profiles set gender = coalesce(nullif(gender, ''), 'female') where gender is null or gender = '';
alter table public.profiles alter column gender set not null;
alter table public.profiles add constraint profiles_gender_must_be_female check (gender = 'female');

alter table public.profiles alter column selfie_verified set default false;
alter table public.profiles alter column selfie_verified set not null;

alter table public.profiles alter column onboarding_completed set default false;
alter table public.profiles alter column onboarding_completed set not null;

-- normalize gender text from metadata; fallback to 'female' when absent
create or replace function normalize_gender_text(meta jsonb)
returns text as $$
declare gender text;
begin
  gender := (meta->>'gender');
  if coalesce(meta->>'gender', '') = '' then
    return 'female';
  end if;

  if gender = 'female' then
    return 'female';
  else
    return 'female';
  end if;
end;
$$ language plpgsql stable;

-- upsert profile using raw_user_meta_data
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    nome,
    gender,
    selfie_verified,
    onboarding_completed,
    plan,
    free_queries_used,
    credits,
    created_at
  )
  values
    (new.id,
     coalesce(new.email, ''),
     coalesce((new.raw_user_meta_data->>'nome'), ''),
     normalize_gender_text(new.raw_user_meta_data),
     coalesce((new.raw_user_meta_data->>'selfie_verified')::boolean, false),
     coalesce((new.raw_user_meta_data->>'onboarding_completed')::boolean, false),
     'free',
     0,
     0,
     coalesce(new.created_at, now()))
  on conflict (id) do update
    set email = excluded.email,
        nome = excluded.nome,
        gender = excluded.gender,
        selfie_verified = coalesce(profiles.selfie_verified, excluded.selfie_verified, false),
        onboarding_completed = coalesce(profiles.onboarding_completed, excluded.onboarding_completed, false),
        plan = coalesce(profiles.plan, excluded.plan, 'free'),
        free_queries_used = coalesce(profiles.free_queries_used, excluded.free_queries_used, 0),
        credits = coalesce(profiles.credits, excluded.credits, 0),
        created_at = coalesce(profiles.created_at, excluded.created_at, now());
  return new;
end;
$$ language plpgsql security definer;

-- drop and recreate the trigger on auth.users to call our function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- (re)enable row-level security and reset policies for profiles
alter table public.profiles enable row level security;
drop policy if exists "Profiles owners can read their own profile" on public.profiles;
drop policy if exists "Female users can read their data" on public.profiles;
drop policy if exists "Profiles owners insert their own profile" on public.profiles;
drop policy if exists "Females users insert their own data" on public.profiles;
drop policy if exists "Profiles owners can update their own profile" on public.profiles;
drop policy if exists "Females can update their data" on public.profiles;

create policy "Profiles owners can read their own profile"
  on public.profiles
  for select using (
    auth.uid() = id
    and gender = 'female'
  );

create policy "Profiles owners insert their own profile"
  on public.profiles
  for insert with check (
    auth.uid() = id
    and gender = 'female'
    and selfie_verified = false
  );

create policy "Profiles owners can update their own profile"
  on public.profiles
  for update using (
    auth.uid() = id
    and gender = 'female'
  )
  with check (
    auth.uid() = id
    and gender = 'female'
    and selfie_verified = false
    and onboarding_completed = false
  );
