-- Ensure profiles can store Stripe subscription identifier for webhook sync.

alter table public.profiles
  add column if not exists stripe_subscription_id text null;

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id);
