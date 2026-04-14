create table if not exists public.mobile_purchase_links (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('apple', 'google')),
  original_transaction_id text not null,
  latest_transaction_id text not null,
  app_account_token uuid,
  first_user_id uuid not null references auth.users(id) on delete cascade,
  last_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, original_transaction_id)
);

create unique index if not exists mobile_purchase_links_platform_latest_tx_uniq
  on public.mobile_purchase_links (platform, latest_transaction_id);

create index if not exists mobile_purchase_links_last_user_idx
  on public.mobile_purchase_links (last_user_id);
