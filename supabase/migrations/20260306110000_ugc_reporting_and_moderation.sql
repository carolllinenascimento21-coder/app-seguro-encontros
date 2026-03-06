-- UGC safety: reporting workflow + moderation status

alter table public.avaliacoes
  add column if not exists reported_count integer not null default 0;

alter table public.avaliacoes
  add column if not exists status text not null default 'public';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'avaliacoes_status_check'
       and conrelid = 'public.avaliacoes'::regclass
  ) then
    alter table public.avaliacoes
      add constraint avaliacoes_status_check
      check (status in ('public', 'pending_moderation', 'hidden', 'removed'));
  end if;
end $$;

create index if not exists avaliacoes_status_idx
  on public.avaliacoes (status);

create table if not exists public.reportes_ugc (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists reportes_ugc_unique_user_review_idx
  on public.reportes_ugc (avaliacao_id, user_id);

create index if not exists reportes_ugc_avaliacao_id_idx
  on public.reportes_ugc (avaliacao_id);

create index if not exists reportes_ugc_user_id_idx
  on public.reportes_ugc (user_id);

create or replace function public.handle_ugc_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.avaliacoes
     set reported_count = coalesce(reported_count, 0) + 1
   where id = new.avaliacao_id
   returning reported_count into next_count;

  if next_count is null then
    return new;
  end if;

  if next_count >= 3 then
    update public.avaliacoes
       set status = 'pending_moderation'
     where id = new.avaliacao_id
       and status = 'public';
  end if;

  return new;
end;
$$;

drop trigger if exists on_reportes_ugc_insert on public.reportes_ugc;
create trigger on_reportes_ugc_insert
after insert on public.reportes_ugc
for each row
execute function public.handle_ugc_report_insert();

alter table public.reportes_ugc enable row level security;

-- Leitura por usuária dona da denúncia
create policy if not exists "UGC reports select own"
  on public.reportes_ugc
  for select
  using (auth.uid() = user_id);

-- Inserção por usuária autenticada no próprio user_id
create policy if not exists "UGC reports insert own"
  on public.reportes_ugc
  for insert
  with check (auth.uid() = user_id);

-- Moderação apenas service role
create policy if not exists "UGC reports service role manage"
  on public.reportes_ugc
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
