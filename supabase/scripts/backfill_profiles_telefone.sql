-- Backfill telefone for legacy profiles using auth metadata when available.
update public.profiles as p
set telefone = u.raw_user_meta_data->>'phone'
from auth.users as u
where p.id = u.id
  and p.telefone is null
  and u.raw_user_meta_data->>'phone' is not null
  and u.raw_user_meta_data->>'phone' <> '';

-- Ensure onboarding_completed is never NULL for existing rows.
update public.profiles
set onboarding_completed = false
where onboarding_completed is null;
