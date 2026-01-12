-- Ensure anonymous avaliações do not consume credits and keep insert policy service-role only.

create or replace function public.consume_credit_for_avaliacao(user_uuid uuid)
returns boolean as $$
declare
  current_plan text;
  current_credits integer;
  current_expires timestamp with time zone;
begin
  if user_uuid is null then
    return true;
  end if;

  select plan, credits, plan_expires_at
    into current_plan, current_credits, current_expires
    from public.profiles
   where id = user_uuid
   for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if public.is_plan_active(current_plan, current_expires) then
    return true;
  end if;

  update public.profiles
     set credits = credits - 1
   where id = user_uuid
     and credits > 0
  returning credits
    into current_credits;

  if not found then
    return false;
  end if;

  insert into public.credit_transactions (user_id, type, amount)
  values (user_uuid, 'avaliacao', -1);

  return true;
end;
$$ language plpgsql security definer set search_path = public, row_security = off;

create or replace function public.handle_avaliacao_credit_consumption()
returns trigger as $$
declare
  allowed boolean;
begin
  if new.user_id is null then
    return new;
  end if;

  allowed := public.consume_credit_for_avaliacao(new.user_id);
  if not allowed then
    raise exception 'PAYWALL';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, row_security = off;

drop trigger if exists consume_avaliacao_credit on public.avaliacoes;
create trigger consume_avaliacao_credit
  before insert on public.avaliacoes
  for each row execute procedure public.handle_avaliacao_credit_consumption();

alter table public.avaliacoes enable row level security;

drop policy if exists "Avaliacoes insert own" on public.avaliacoes;
drop policy if exists "Avaliacoes insert service role" on public.avaliacoes;

create policy "Avaliacoes insert service role"
  on public.avaliacoes
  for insert
  with check (auth.role() = 'service_role');
