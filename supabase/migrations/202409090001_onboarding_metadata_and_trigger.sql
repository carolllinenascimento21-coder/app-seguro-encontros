-- Ensure onboarding flag exists on profiles
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Keep gender and selfie defaults hardened
alter table public.profiles
  alter column gender set default 'female';

alter table public.profiles
  alter column selfie_verified set default false;

-- Recreate handle_new_user to use metadata and avoid relying on a client session
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    created_at,
    gender,
    selfie_verified,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    now(),
    coalesce(nullif(new.raw_user_meta_data->>'gender', ''), 'female'),
    coalesce((new.raw_user_meta_data->>'selfie_verified')::boolean, false),
    coalesce((new.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
