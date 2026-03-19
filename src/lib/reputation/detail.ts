const CATEGORY_KEYS = [
  'comportamento',
  'seguranca_emocional',
  'respeito',
  'carater',
  'confianca',
] as const

type CategoryKey = (typeof CATEGORY_KEYS)[number]

type ReviewRow = {
  id: string
  created_at: string
  rating: number | null
  review_text: string | null
  relato: string | null
  notas: string | null
  flags_negative: string[] | null
  is_anonymous: boolean | null
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
}

type SummaryRow = {
  average_rating: number | null
  total_reviews: number | null
  alert_count: number | null
  classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente' | null
}

const toReviewText = (review: ReviewRow) =>
  review.review_text ?? review.relato ?? review.notas ?? null

const safeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const calcRating = (review: ReviewRow) => {
  const values = [
    review.comportamento,
    review.seguranca_emocional,
    review.respeito,
    review.carater,
    review.confianca,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (values.length === 0) {
    return safeNumber(review.rating)
  }

  const avg = values.reduce((acc, value) => acc + value, 0) / values.length
  return Number(avg.toFixed(1))
}

export async function getDetailedReputation(
  supabaseAdmin: any,
  maleProfileId: string
) {
  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', maleProfileId)
    .single()

  if (maleProfileError || !maleProfile) {
    return { error: 'Perfil não encontrado', status: 404 as const }
  }

  const { data: summary, error: summaryError } = await supabaseAdmin
    .from('male_profile_reputation_summary')
    .select('average_rating, total_reviews, alert_count, classification')
    .eq('male_profile_id', maleProfileId)
    .maybeSingle()

  if (summaryError) {
    return { error: 'Erro ao carregar reputação', status: 500 as const }
  }

  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .from('avaliacoes')
    .select(
      `
        id,
        created_at,
        rating,
        review_text,
        relato,
        notas,
        flags_negative,
        is_anonymous,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca
      `
    )
    .eq('male_profile_id', maleProfileId)
    .or('status.eq.public,publica.eq.true,publica.is.null')
    .order('created_at', { ascending: false })

  if (reviewsError) {
    return { error: 'Erro ao carregar avaliações', status: 500 as const }
  }

  const summaryRow = (summary ?? null) as SummaryRow | null
  const reviewRows = (reviews ?? []) as ReviewRow[]

  const categoryTotals: Record<CategoryKey, { sum: number; count: number }> = {
    comportamento: { sum: 0, count: 0 },
    seguranca_emocional: { sum: 0, count: 0 },
    respeito: { sum: 0, count: 0 },
    carater: { sum: 0, count: 0 },
    confianca: { sum: 0, count: 0 },
  }

  for (const review of reviewRows) {
    for (const key of CATEGORY_KEYS) {
      const value = review[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        categoryTotals[key].sum += value
        categoryTotals[key].count += 1
      }
    }
  }

  const categoryAverages: Record<CategoryKey, number> = {
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  }

  for (const key of CATEGORY_KEYS) {
    const { sum, count } = categoryTotals[key]
    categoryAverages[key] = count > 0 ? Number((sum / count).toFixed(1)) : 0
  }

  const alertMap = new Map<string, number>()

  for (const review of reviewRows) {
    for (const rawFlag of review.flags_negative ?? []) {
      const normalized = rawFlag.trim().toLowerCase()
      if (!normalized) continue
      alertMap.set(normalized, (alertMap.get(normalized) ?? 0) + 1)
    }
  }

  const alertas = [...alertMap.entries()]
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)

  const reputation = {
    average_rating: Number(safeNumber(summaryRow?.average_rating).toFixed(1)),
    total_reviews: safeNumber(summaryRow?.total_reviews),
    alert_count: safeNumber(summaryRow?.alert_count),
    classification: summaryRow?.classification ?? 'confiavel',
  }

  return {
    status: 200 as const,
    data: {
      profile: {
        id: maleProfile.id,
        display_name: maleProfile.display_name,
        city: maleProfile.city,
      },
      reputation,
      category_averages: categoryAverages,
      alertas,
      relatos: reviewRows
        .filter((review) => Boolean(toReviewText(review)))
        .map((review) => ({
          id: review.id,
          rating: calcRating(review),
          review_text: toReviewText(review),
          created_at: review.created_at,
          flags_negative: Array.isArray(review.flags_negative)
            ? review.flags_negative
            : [],
          is_anonymous: Boolean(review.is_anonymous),
        })),
      reviews: reviewRows.map((review) => ({
        id: review.id,
        rating: calcRating(review),
        review_text: toReviewText(review),
        created_at: review.created_at,
        flags_negative: Array.isArray(review.flags_negative)
          ? review.flags_negative
          : [],
        is_anonymous: Boolean(review.is_anonymous),
      })),
      average_rating: Number(safeNumber(summaryRow?.average_rating).toFixed(1)),
      media: Number(safeNumber(summaryRow?.average_rating).toFixed(1)),
      total_reviews: safeNumber(summaryRow?.total_reviews),
      total: safeNumber(summaryRow?.total_reviews),
      alerts: safeNumber(summaryRow?.alert_count),
      alert_count: safeNumber(summaryRow?.alert_count),
      classificacao: summaryRow?.classification ?? 'confiavel',
      classification: summaryRow?.classification ?? 'confiavel',
    },
  }
}
