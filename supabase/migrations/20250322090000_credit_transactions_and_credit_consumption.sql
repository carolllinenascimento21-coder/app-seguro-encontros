-- Credit transactions ledger, idempotent credit grants, and safer consumption

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  amount integer not null,
  external_reference text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

create unique index if not exists credit_transactions_external_reference_unique
  on public.credit_transactions (external_reference)
  where external_reference is not null;

alter table public.credit_transactions enable row level security;

drop policy if exists "Users read own credit transactions" on public.credit_transactions;
drop policy if exists "Service role manages credit transactions" on public.credit_transactions;

create policy "Users read own credit transactions"
  on public.credit_transactions
  for select using (auth.uid() = user_id);

create policy "Service role manages credit transactions"
  on public.credit_transactions
  for all using (auth.role() = 'service_role')
  with check (true);

create or replace function public.add_profile_credits_with_transaction(
  user_uuid uuid,
  credit_delta integer,
  external_ref text,
  transaction_type text default 'credit_purchase'
)
returns void as $$
begin
  if external_ref is not null then
    if exists (
      select 1
        from public.credit_transactions
       where external_reference = external_ref
    ) then
      return;
    end if;
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + coalesce(credit_delta, 0)
   where id = user_uuid;

  insert into public.credit_transactions (user_id, type, amount, external_reference)
  values (user_uuid, transaction_type, credit_delta, external_ref);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.consume_credit_for_action(user_uuid uuid, action text)
returns table(plan text, credits integer) as $$
declare
  current_plan text;
  current_credits integer;
begin
  select plan, credits
    into current_plan, current_credits
    from public.profiles
   where id = user_uuid;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if current_plan <> 'free' then
    return query select current_plan, current_credits;
    return;
  end if;

  update public.profiles
     set credits = credits - 1
   where id = user_uuid
     and credits > 0
  returning plan, credits
    into current_plan, current_credits;

  if not found then
    raise exception 'PAYWALL';
  end if;

  insert into public.credit_transactions (user_id, type, amount)
  values (user_uuid, action, -1);

  return query select current_plan, current_credits;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.consume_query(user_uuid uuid)
returns table(plan text, free_queries_used integer, credits integer) as $$
declare
  current_plan text;
  used integer;
  current_credits integer;
begin
  select plan, free_queries_used, credits
    into current_plan, used, current_credits
    from public.profiles
   where id = user_uuid;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if current_plan = 'free' then
    update public.profiles
       set free_queries_used = free_queries_used + 1
     where id = user_uuid
       and free_queries_used < 3
    returning plan, free_queries_used, credits
      into current_plan, used, current_credits;

    if not found then
      update public.profiles
         set credits = credits - 1
       where id = user_uuid
         and credits > 0
      returning plan, free_queries_used, credits
        into current_plan, used, current_credits;

      if not found then
        raise exception 'PAYWALL';
      end if;

      insert into public.credit_transactions (user_id, type, amount)
      values (user_uuid, 'consulta', -1);
    end if;
  else
    select plan, free_queries_used, credits
      into current_plan, used, current_credits
      from public.profiles
     where id = user_uuid;
  end if;

  insert into public.consultas (user_id) values (user_uuid);

  return query select current_plan, used, current_credits;
end;
$$ language plpgsql security definer set search_path = public;
