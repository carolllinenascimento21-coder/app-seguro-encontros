-- Backfill legacy profiles for auth users without profiles
insert into public.profiles (id, nome, email, telefone, onboarding_completed, selfie_verified)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'name', users.raw_user_meta_data->>'nome', users.email, 'Usuário') as nome,
  users.email,
  users.raw_user_meta_data->>'phone' as telefone,
  false as onboarding_completed,
  false as selfie_verified
from auth.users as users
left join public.profiles as profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

-- Fill missing telefone values from auth metadata when available
update public.profiles as profiles
set telefone = users.raw_user_meta_data->>'phone'
from auth.users as users
where profiles.id = users.id
  and profiles.telefone is null
  and users.raw_user_meta_data ? 'phone';
