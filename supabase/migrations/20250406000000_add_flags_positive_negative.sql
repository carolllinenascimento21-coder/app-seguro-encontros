-- Add positive/negative flags and improve search

alter table public.avaliacoes
  add column if not exists flags_positive text[] not null default '{}'::text[],
  add column if not exists flags_negative text[] not null default '{}'::text[];

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'avaliacoes'
       and column_name = 'flags'
  ) then
    execute '
      update public.avaliacoes
         set flags_negative = coalesce(flags, ''{}''::text[])
       where array_length(flags_negative, 1) is null
          or array_length(flags_negative, 1) = 0
    ';
    execute 'alter table public.avaliacoes drop column flags';
  end if;
end $$;

create extension if not exists pg_trgm;

create index if not exists avaliacoes_nome_trgm
  on public.avaliacoes using gin (nome gin_trgm_ops);

create index if not exists avaliacoes_cidade_trgm
  on public.avaliacoes using gin (cidade gin_trgm_ops);

create or replace function public.submit_avaliacao(
  nome text,
  cidade text,
  contato text,
  relato text,
  flags_positive text[],
  flags_negative text[],
  anonimo boolean,
  comportamento integer,
  seguranca_emocional integer,
  respeito integer,
  carater integer,
  confianca integer
)
returns uuid as $$
declare
  current_user uuid := auth.uid();
  avaliacao_id uuid;
  allowed boolean;
begin
  if current_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  allowed := public.consume_credit_for_avaliacao(current_user);
  if not allowed then
    raise exception 'PAYWALL';
  end if;

  insert into public.avaliacoes (
    user_id,
    nome,
    cidade,
    contato,
    relato,
    flags_positive,
    flags_negative,
    anonimo,
    is_anonymous,
    publica,
    comportamento,
    seguranca_emocional,
    respeito,
    carater,
    confianca
  )
  values (
    current_user,
    nome,
    cidade,
    contato,
    relato,
    coalesce(flags_positive, '{}'::text[]),
    coalesce(flags_negative, '{}'::text[]),
    coalesce(anonimo, true),
    coalesce(anonimo, true),
    not coalesce(anonimo, true),
    coalesce(comportamento, 0),
    coalesce(seguranca_emocional, 0),
    coalesce(respeito, 0),
    coalesce(carater, 0),
    coalesce(confianca, 0)
  )
  returning id into avaliacao_id;

  return avaliacao_id;
end;
$$ language plpgsql security definer set search_path = public, row_security = off;
