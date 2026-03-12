begin;

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
  where a.publica = true
    and a.status = 'public'
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
