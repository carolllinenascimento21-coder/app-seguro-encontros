alter table public.avaliacoes
  add column if not exists autor_id uuid references auth.users(id) on delete set null;

create index if not exists avaliacoes_autor_id_idx
  on public.avaliacoes (autor_id);

alter table public.avaliacoes enable row level security;

drop policy if exists "Avaliacoes select own or public" on public.avaliacoes;
drop policy if exists "Avaliacoes insert own" on public.avaliacoes;
drop policy if exists "Avaliacoes update own" on public.avaliacoes;
drop policy if exists "Avaliacoes delete own" on public.avaliacoes;

create policy "Avaliacoes select own or public"
  on public.avaliacoes
  for select
  using (
    auth.uid() = coalesce(autor_id, user_id)
    or (
      is_anonymous = false
      and publica = true
      and public.can_view_public_avaliacoes(auth.uid())
    )
  );

create policy "Avaliacoes insert own"
  on public.avaliacoes
  for insert
  with check (auth.uid() = coalesce(autor_id, user_id));

create policy "Avaliacoes update own"
  on public.avaliacoes
  for update
  using (auth.uid() = coalesce(autor_id, user_id))
  with check (auth.uid() = coalesce(autor_id, user_id));

create policy "Avaliacoes delete own"
  on public.avaliacoes
  for delete
  using (auth.uid() = coalesce(autor_id, user_id));
