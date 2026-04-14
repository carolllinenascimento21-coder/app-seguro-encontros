create table if not exists public.billing_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null,
  plan_id text not null,
  status text not null,
  is_active boolean not null default false,
  environment text not null check (environment in ('production', 'sandbox')),
  external_subscription_id text not null,
  external_transaction_id text not null,
  original_transaction_id text not null,
  purchase_token text,
  started_at timestamptz,
  expires_at timestamptz,
  canceled_at timestamptz,
  revoked_at timestamptz,
  last_event_timestamp_ms bigint not null,
  raw_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_subscription_id)
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status, is_active);

create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  idempotency_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  platform text not null check (platform in ('apple', 'google')),
  event_type text not null,
  event_timestamp_ms bigint not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_platform_ts_idx
  on public.billing_events (platform, event_timestamp_ms desc);

create index if not exists billing_events_idempotency_idx
  on public.billing_events (idempotency_key);
