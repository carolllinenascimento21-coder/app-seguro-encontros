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
  relato: string | null
  notas: string | null
  flags_negative: string[] | null
  flags_positive: string[] | null
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

type ProfileLikeRow = {
  id?: string | null
  display_name?: string | null
  name?: string | null
  nome?: string | null
  city?: string | null
  cidade?: string | null
}

const toReviewText = (review: ReviewRow) => review.relato ?? review.notas ?? null

const safeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const computeRating = (review: ReviewRow) => {
  const values = [
    review.comportamento,
    review.seguranca_emocional,
    review.respeito,
    review.carater,
    review.confianca,
  ].filter((value): value is number => typeof value === 'number')

  if (values.length === 0) return 0

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Number(average.toFixed(1))
}

export async function getDetailedReputation(
  supabaseAdmin: any,
  maleProfileId: string
) {
  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', maleProfileId)
    .maybeSingle()

  if (maleProfileError) {
    console.warn('Erro ao buscar male_profile no detalhe público', maleProfileError.message)
  }

  const { data: legacyProfile, error: legacyProfileError } = maleProfile
    ? { data: null, error: null }
    : await supabaseAdmin
        .from('avaliados')
        .select('*')
        .eq('id', maleProfileId)
        .maybeSingle()

  if (legacyProfileError) {
    console.warn('Erro ao buscar avaliado legado no detalhe público', legacyProfileError.message)
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
        relato,
        notas,
        flags_negative,
        flags_positive,
        is_anonymous,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca
      `
    )
    .or(`male_profile_id.eq.${maleProfileId},avaliado_id.eq.${maleProfileId}`)
    .eq('publica', true)
    .order('created_at', { ascending: false })

  if (reviewsError) {
    return { error: 'Erro ao carregar avaliações', status: 500 as const }
  }

  const summaryRow = (summary ?? null) as SummaryRow | null
  const reviewRows = (reviews ?? []) as ReviewRow[]
  const profileRow = (maleProfile ?? legacyProfile ?? { id: maleProfileId }) as ProfileLikeRow

  if (!profileRow?.id && reviewRows.length === 0) {
    return { error: 'Perfil não encontrado', status: 404 as const }
  }

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
      if (typeof value === 'number') {
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

  const totalReviews = reviewRows.length
  const averageRating = totalReviews > 0
    ? Number((reviewRows.reduce((sum, review) => sum + computeRating(review), 0) / totalReviews).toFixed(1))
    : Number(safeNumber(summaryRow?.average_rating).toFixed(1))
  const alertCount = reviewRows.reduce(
    (sum, review) => sum + (Array.isArray(review.flags_negative) ? review.flags_negative.length : 0),
    0
  )
  const classification = averageRating < 2
    ? 'perigo'
    : averageRating < 3
      ? 'atencao'
      : averageRating < 4
        ? 'confiavel'
        : 'excelente'

  const reputation = {
    average_rating: averageRating,
    total_reviews: totalReviews || safeNumber(summaryRow?.total_reviews),
    alert_count: totalReviews ? alertCount : safeNumber(summaryRow?.alert_count),
    classification,
  }

  return {
    status: 200 as const,
    data: {
      profile: {
        id: profileRow.id ?? maleProfileId,
        display_name: profileRow.display_name ?? profileRow.name ?? profileRow.nome ?? 'Perfil consultado',
        city: profileRow.city ?? profileRow.cidade ?? null,
      },
      reputation,
      category_averages: categoryAverages,
      alertas,
      relatos: reviewRows
        .filter((review) => Boolean(toReviewText(review)))
        .map((review) => ({
          id: review.id,
          rating: computeRating(review),
          review_text: toReviewText(review),
          created_at: review.created_at,
          flags_negative: Array.isArray(review.flags_negative) ? review.flags_negative : [],
          flags_positive: Array.isArray(review.flags_positive) ? review.flags_positive : [],
          comportamento: review.comportamento,
          seguranca_emocional: review.seguranca_emocional,
          respeito: review.respeito,
          carater: review.carater,
          confianca: review.confianca,
          is_anonymous: Boolean(review.is_anonymous),
        })),
      reviews: reviewRows.map((review) => ({
        id: review.id,
        rating: computeRating(review),
        review_text: toReviewText(review),
        created_at: review.created_at,
        flags_negative: Array.isArray(review.flags_negative) ? review.flags_negative : [],
        flags_positive: Array.isArray(review.flags_positive) ? review.flags_positive : [],
        comportamento: review.comportamento,
        seguranca_emocional: review.seguranca_emocional,
        respeito: review.respeito,
        carater: review.carater,
        confianca: review.confianca,
        is_anonymous: Boolean(review.is_anonymous),
      })),
      average_rating: reputation.average_rating,
      media: reputation.average_rating,
      total_reviews: reputation.total_reviews,
      total: reputation.total_reviews,
      alerts: reputation.alert_count,
      alert_count: reputation.alert_count,
      classificacao: reputation.classification,
      classification: reputation.classification,
    },
  }
}
