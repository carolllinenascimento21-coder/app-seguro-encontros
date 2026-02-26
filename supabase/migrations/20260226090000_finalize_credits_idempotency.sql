-- Finaliza arquitetura de créditos com ledger idempotente e saldo em user_credits.

alter table public.credit_transactions
add column if not exists external_reference text;

create unique index if not exists credit_transactions_external_reference_unique
on public.credit_transactions (external_reference);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  status text not null default 'received',
  error text null
);

alter table public.stripe_events
add column if not exists error text;

create or replace function public.add_profile_credits_with_transaction(
  user_uuid uuid,
  credit_delta integer,
  external_ref text,
  transaction_type text default 'credit_purchase'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_tx_id uuid;
begin
  insert into public.credit_transactions (user_id, type, amount, external_reference)
  values (user_uuid, transaction_type, credit_delta, external_ref)
  on conflict (external_reference) do nothing
  returning id into inserted_tx_id;

  if external_ref is not null and inserted_tx_id is null then
    return;
  end if;

  insert into public.user_credits (user_id, balance, updated_at)
  values (user_uuid, 0, now())
  on conflict (user_id) do nothing;

  update public.user_credits
  set balance = balance + coalesce(credit_delta, 0),
      updated_at = now()
  where user_id = user_uuid;
end;
$$;
