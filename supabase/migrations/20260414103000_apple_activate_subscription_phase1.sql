create table if not exists public.apple_purchase_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  transaction_id text not null,
  original_transaction_id text not null,
  purchase_date timestamptz not null,
  expiration_date timestamptz,
  environment text not null check (environment in ('sandbox', 'production')),
  app_account_token uuid,
  signed_transaction_info text not null,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (transaction_id)
);

create index if not exists apple_purchase_events_user_id_idx
  on public.apple_purchase_events (user_id, created_at desc);

create index if not exists apple_purchase_events_original_transaction_id_idx
  on public.apple_purchase_events (original_transaction_id);

alter table public.apple_purchase_events enable row level security;
