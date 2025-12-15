-- Ensure profiles.email exists, is unique, and backfilled from auth.users
alter table public.profiles
  add column if not exists email text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;
end $$;

-- Backfill email for existing profiles from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null;
