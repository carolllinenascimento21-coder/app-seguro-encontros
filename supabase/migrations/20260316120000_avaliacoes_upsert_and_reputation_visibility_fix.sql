begin;

-- Garante unicidade de 1 avaliação por usuária + perfil.
create unique index if not exists unique_user_profile_review
  on public.avaliacoes (user_id, male_profile_id);

-- Atualiza função transacional para suportar upsert idempotente.
create or replace function public.create_avaliacao_transaction(
  p_male_profile_id uuid,
  p_user_id uuid,
  p_relato text,
  p_anonimo boolean,
  p_comportamento integer,
  p_seguranca_emocional integer,
  p_respeito integer,
  p_carater integer,
  p_confianca integer,
  p_flags_positive text[],
  p_flags_negative text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_avaliacao_id uuid;
begin
  insert into public.avaliacoes (
    male_profile_id,
    user_id,
    relato,
    anonimo,
    is_anonymous,
    publica,
    status,
    comportamento,
    seguranca_emocional,
    respeito,
    carater,
    confianca,
    flags_positive,
    flags_negative
  )
  values (
    p_male_profile_id,
    p_user_id,
    p_relato,
    coalesce(p_anonimo, false),
    coalesce(p_anonimo, false),
    true,
    'public',
    nullif(p_comportamento, 0),
    nullif(p_seguranca_emocional, 0),
    nullif(p_respeito, 0),
    nullif(p_carater, 0),
    nullif(p_confianca, 0),
    coalesce(p_flags_positive, '{}'::text[]),
    coalesce(p_flags_negative, '{}'::text[])
  )
  on conflict (user_id, male_profile_id)
  do update set
    relato = excluded.relato,
    anonimo = excluded.anonimo,
    is_anonymous = excluded.is_anonymous,
    publica = excluded.publica,
    status = excluded.status,
    comportamento = excluded.comportamento,
    seguranca_emocional = excluded.seguranca_emocional,
    respeito = excluded.respeito,
    carater = excluded.carater,
    confianca = excluded.confianca,
    flags_positive = excluded.flags_positive,
    flags_negative = excluded.flags_negative
  returning id into v_avaliacao_id;

  return v_avaliacao_id;
end;
$$;

-- View de resumo não deve excluir linhas com publica NULL.
create or replace view public.male_profile_reputation_summary as
with reviews as (
  select
    a.male_profile_id,
    (
      coalesce(a.comportamento, 0)
      + coalesce(a.seguranca_emocional, 0)
      + coalesce(a.respeito, 0)
      + coalesce(a.carater, 0)
      + coalesce(a.confianca, 0)
    )::numeric / 5 as review_rating,
    coalesce(array_length(a.flags_negative, 1), 0) as review_alert_count
  from public.avaliacoes a
  where a.publica is not false
), aggregated as (
  select
    r.male_profile_id,
    count(*)::int as total_reviews,
    round(avg(r.review_rating)::numeric, 1) as average_rating,
    round(
      (
        count(*) filter (where r.review_rating >= 3)::numeric
        / nullif(count(*), 0)
      ) * 100,
      0
    )::int as positive_percentage,
    sum(r.review_alert_count)::int as alert_count
  from reviews r
  group by r.male_profile_id
)
select
  mp.id as male_profile_id,
  mp.display_name as name,
  mp.city,
  coalesce(agg.average_rating, 0)::numeric(3, 1) as average_rating,
  coalesce(agg.total_reviews, 0)::int as total_reviews,
  coalesce(agg.positive_percentage, 0)::int as positive_percentage,
  coalesce(agg.alert_count, 0)::int as alert_count,
  case
    when coalesce(agg.average_rating, 0) < 2 then 'perigo'
    when coalesce(agg.average_rating, 0) < 3 then 'atencao'
    when coalesce(agg.average_rating, 0) < 4 then 'confiavel'
    else 'excelente'
  end as classification
from public.male_profiles mp
left join aggregated agg on agg.male_profile_id = mp.id
where mp.is_active = true;

commit;
