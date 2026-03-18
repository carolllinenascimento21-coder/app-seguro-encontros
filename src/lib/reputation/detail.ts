const CATEGORY_KEYS = [
  'comportamento',
  'seguranca_emocional',
  'respeito',
  'carater',
  'confianca',
] como constante

tipo CategoryKey = (typeof CATEGORY_KEYS)[número]

tipo ReviewRow = {
  id: string
  criado_em: string
  classificação: número | nulo
  texto_da_avaliação: string | nulo
  relato: string | nulo
  : string | nulo
  flags_negative: string[] | null
  is_anonymous: booleano | nulo
  comportamento: número | nulo
  seguranca_emocional: número | nulo
  : número | nulo
  caractere: número | nulo
  confianca: número | nulo
}

tipo SummaryRow = {
  classificação_média: número | nulo
  total_avaliações: número | nulo
  contagem_de_alertas: número | nulo
  classificação: 'perigo' | 'atencao' | 'confiavel' | 'excelente' | nulo
}

const toReviewText = (review: ReviewRow) =>
  review.review_text ?? review.relato ?? review.notas ?? null

const safeNumber = (valor: desconhecido) => {
  const analisado = Número(valor)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getDetailedReputation(
  supabaseAdmin: qualquer,
  maleProfileId: string
) {
  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('perfis_masculinos')
    .select('id, display_name, city')
    .eq('id', maleProfileId)
    .solteiro()

  se (maleProfileError || !maleProfile) {
    return {erro: 'Perfil não encontrado', status: 404 as const }
  }

  const { data: summary, error: summaryError } = await supabaseAdmin
    .from('male_profile_reputation_summary')
    .select('average_rating, total_reviews, alert_count, classification')
    .eq('male_profile_id', maleProfileId)
    .talvezSingle()

  se (summaryError) {
    return { error: 'Erro ao carregar confiança', status: 500 as const }
  }

  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .de('avaliacoes')
    .selecionar(
      `
        eu ia,
        criado_em,
        relato,
        notas,
        flags_negativas,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca
      `
    )
    .eq('male_profile_id', maleProfileId)
    .eq('publica', true)
    .order('created_at', { ascending: false })

  se (reviewsError) {
    return { error: 'Erro ao carregar avaliações', status: 500 as const }
  }

  const summaryRow = (summary ?? null) as SummaryRow | null
  const reviewRows = (reviews ?? []) as ReviewRow[]

  const categoryTotals: Record<CategoryKey, { sum: number; count: number }> = {
    comportamento: {soma: 0, contagem: 0},
    seguranca_emocional: { soma: 0, contagem: 0 },
    respeito: {soma: 0, contagem: 0},
    caractere: { soma: 0, contagem: 0 },
    confiança: { soma: 0, contagem: 0 },
  }

  para (const review de reviewRows) {
    para (const key de CATEGORY_KEYS) {
      const value = review[key]
      se (tipo de valor === 'número') {
        categoryTotais[chave].soma += valor
        categoryTotals[key].count += 1
      }
    }
  }

  const categoryAverages: Record<CategoryKey, number> = {
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    caractere: 0,
    confianca: 0,
  }

  para (const key de CATEGORY_KEYS) {
    const { sum, count } = categoryTotals[key]
    categoryAverages[key] = count > 0 ? Number((sum / count).toFixed(1)) : 0
  }

  const alertMap = new Map<string, number>()

  para (const review de reviewRows) {
    para (const rawFlag de review.flags_negative ?? []) {
      const normalizado = rawFlag.trim().toLowerCase()
      se (!normalizado) continue
      alertMap.set(normalized, (alertMap.get(normalized) ?? 0) + 1)
    }
  }

  const alertas = [...alertMap.entries()]
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)

  const reputação = {
    classificação_média: Número(número_seguro(linha_resumo?.classificação_média).para_fixo(1)),
    total_reviews: safeNumber(summaryRow?.total_reviews),
    alert_count: safeNumber(summaryRow?.alert_count),
    classificação: summaryRow?.classificação ?? 'confiavel',
  }

  retornar {
    status: 200 como constante,
    dados: {
      perfil: {
        id: maleProfile.id,
        nome_de_exibição: perfil_masculino.nome_de_exibição,
        cidade: maleProfile.city,
      },
      reputação,
      médias_de_categoria: médias_de_categoria,
      alertas,
      relatos: revisãoRows
        .filter((review) => Boolean(toReviewText(review)))
        .map((review) => ({
          id: review.id,
          classificação: safeNumber(avaliação.classificação),
          texto_da_avaliação: paraTexto_da_avaliação(avaliação),
          criado_em: revisão.criado_em,
          flags_negative: Array.isArray(review.flags_negative) ? review.flags_negative : [],
          is_anonymous: Booleano(review.is_anonymous),
        })),
      avaliações: linhasDeAvaliação.map((avaliação) => ({
        id: review.id,
        classificação: safeNumber(avaliação.classificação),
        texto_da_avaliação: paraTexto_da_avaliação(avaliação),
        criado_em: revisão.criado_em,
        flags_negative: Array.isArray(review.flags_negative) ? review.flags_negative : [],
        is_anonymous: Booleano(review.is_anonymous),
      })),
      classificação_média: Número(número_seguro(linha_resumo?.classificação_média).para_fixo(1)),
      mídia: Número(safeNumber(summaryRow?.average_rating).toFixed(1)),
      total_reviews: safeNumber(summaryRow?.total_reviews),
      total: safeNumber(summaryRow?.total_reviews),
      alertas: safeNumber(summaryRow?.alert_count),
      alert_count: safeNumber(summaryRow?.alert_count),
      classificação: summaryRow?.classificação ?? 'confiavel',
      classificação: summaryRow?.classificação ?? 'confiavel',
    },
  }
}
