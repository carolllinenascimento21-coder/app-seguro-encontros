-- Stripe subscription fields on profiles

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists has_active_plan boolean not null default false,
  add column if not exists current_plan_id text,
  add column if not exists subscription_status text;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
