-- Fix avaliacoes/avaliados relationship and RLS policies

alter table public.avaliacoes
  add column if not exists avaliado_id uuid;

do $$
begin
  if not exists (
    select 1
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
     where tc.table_schema = 'public'
       and tc.table_name = 'avaliacoes'
       and tc.constraint_type = 'FOREIGN KEY'
       and kcu.column_name = 'avaliado_id'
  ) then
    alter table public.avaliacoes
      add constraint avaliacoes_avaliado_id_fkey
      foreign key (avaliado_id)
      references public.avaliados(id)
      on delete set null;
  end if;
end $$;

create index if not exists avaliacoes_avaliado_id_idx
  on public.avaliacoes (avaliado_id);

alter table public.avaliacoes
  alter column flags_positive set default '{}'::text[],
  alter column flags_negative set default '{}'::text[];

alter table public.avaliacoes enable row level security;

-- Avaliacoes: leitura pública apenas quando publica = true
-- e leitura privada para a autora

drop policy if exists "Avaliacoes select public or own" on public.avaliacoes;
create policy "Avaliacoes select public or own"
  on public.avaliacoes
  for select
  using (
    publica = true
    or user_id = auth.uid()
  );

-- Avaliacoes: inserção pública permitida

drop policy if exists "Avaliacoes insert public" on public.avaliacoes;
create policy "Avaliacoes insert public"
  on public.avaliacoes
  for insert
  with check (true);

-- Avaliacoes: atualização e exclusão apenas pela autora

drop policy if exists "Avaliacoes update own" on public.avaliacoes;
create policy "Avaliacoes update own"
  on public.avaliacoes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


drop policy if exists "Avaliacoes delete own" on public.avaliacoes;
create policy "Avaliacoes delete own"
  on public.avaliacoes
  for delete
  using (user_id = auth.uid());

alter table public.avaliados enable row level security;

-- Avaliados: leitura permitida quando há avaliação pública ou da autora

drop policy if exists "Avaliados select public or own" on public.avaliados;
create policy "Avaliados select public or own"
  on public.avaliados
  for select
  using (
    exists (
      select 1
        from public.avaliacoes a
       where a.avaliado_id = avaliados.id
         and (a.publica = true or a.user_id = auth.uid())
    )
  );

-- Avaliados: inserção pública permitida

drop policy if exists "Avaliados insert public" on public.avaliados;
create policy "Avaliados insert public"
  on public.avaliados
  for insert
  with check (true);
