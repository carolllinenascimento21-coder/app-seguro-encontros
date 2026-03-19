import Link from 'next/link'
import { Eye, Lock, Shield, AlertTriangle, Star, Search } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const revalidate = 60
export const preferredRegion = 'home'
export const runtime = 'nodejs'

type Classification = 'perigo' | 'atencao' | 'confiavel' | 'excelente'
type FraudLevel = 'baixo' | 'medio' | 'alto'

type SummaryRow = {
  male_profile_id: string
  average_rating: number | null
  total_reviews: number | null
  alert_count: number | null
  classification: Classification | null
}

type MaleProfileRow = {
  id: string
  display_name: string | null
  city: string | null
  is_active: boolean | null
}

type ReviewSignalRow = {
  male_profile_id: string
  created_at: string
  relato: string | null
  notas: string | null
}

type Perfil = {
  id: string
  display_name: string
  city: string
  average_rating: number
  total_reviews: number
  alert_count: number
  classification: Classification
  weighted_score: number
  fraud_score: number
  fraud_level: FraudLevel
}

type Stats = {
  total_profiles: number
  total_reviews: number
  total_alerts: number
}

const safeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeText = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getReputacaoColor = (nivel: Classification) => {
  switch (nivel) {
    case 'excelente':
      return 'text-green-500 bg-green-500/10 border-green-500/30'
    case 'confiavel':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
    case 'atencao':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
    case 'perigo':
      return 'text-red-500 bg-red-500/10 border-red-500/30'
    default:
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
  }
}

const getReputacaoLabel = (nivel: Classification) => {
  switch (nivel) {
    case 'excelente':
      return 'Excelente'
    case 'confiavel':
      return 'Confiável'
    case 'atencao':
      return 'Atenção'
    case 'perigo':
      return 'Perigo'
    default:
      return 'Confiável'
  }
}

const getFraudLabel = (nivel: FraudLevel) => {
  switch (nivel) {
    case 'alto':
      return 'Atividade incomum alta'
    case 'medio':
      return 'Atividade incomum'
    default:
      return 'Atividade normal'
  }
}

const getFraudColor = (nivel: FraudLevel) => {
  switch (nivel) {
    case 'alto':
      return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'medio':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    default:
      return 'text-gray-400 bg-white/5 border-white/10'
  }
}

function computeFraudSignals(reviews: ReviewSignalRow[]) {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const SEVEN_DAYS = 7 * DAY

  let reviews24h = 0
  let reviews7d = 0
  const textMap = new Map<string, number>()

  for (const review of reviews) {
    const createdAt = new Date(review.created_at).getTime()
    const age = now - createdAt

    if (age <= DAY) reviews24h += 1
    if (age <= SEVEN_DAYS) reviews7d += 1

    const normalized = normalizeText(review.relato ?? review.notas)
    if (normalized.length >= 8) {
      textMap.set(normalized, (textMap.get(normalized) ?? 0) + 1)
    }
  }

  const repeatedTextMax =
    textMap.size > 0 ? Math.max(...Array.from(textMap.values())) : 0

  let fraudScore = 0

  if (reviews24h >= 3) fraudScore += 2
  if (reviews24h >= 5) fraudScore += 2
  if (reviews7d >= 6) fraudScore += 2
  if (repeatedTextMax >= 2) fraudScore += 3
  if (repeatedTextMax >= 3) fraudScore += 2

  let fraudLevel: FraudLevel = 'baixo'
  if (fraudScore >= 7) fraudLevel = 'alto'
  else if (fraudScore >= 3) fraudLevel = 'medio'

  return {
    fraudScore,
    fraudLevel,
    reviews24h,
    reviews7d,
    repeatedTextMax,
  }
}

function computeWeightedScore(params: {
  averageRating: number
  totalReviews: number
  alertCount: number
  fraudScore: number
}) {
  const baseRating = params.averageRating * 20
  const reviewConfidenceBonus = Math.min(params.totalReviews, 20) * 0.5
  const alertPenalty = Math.min(params.alertCount, 10) * 6
  const fraudPenalty = params.fraudScore * 4

  return Number(
    (baseRating + reviewConfidenceBonus - alertPenalty - fraudPenalty).toFixed(2)
  )
}

async function getHomeData(search?: string) {
  const supabase = getSupabaseAdminClient()
  const normalizedSearch = search?.trim() ?? ''

  const [
    statsProfilesRes,
    statsReviewsRes,
    allAlertsRes,
    profileSearchRes,
    defaultSummaryRes,
  ] = await Promise.all([
    supabase
      .from('male_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase
      .from('avaliacoes')
      .select('id', { count: 'exact', head: true })
      .eq('publica', true),

    supabase
      .from('male_profile_reputation_summary')
      .select('alert_count'),

    normalizedSearch
      ? supabase
          .from('male_profiles')
          .select('id, display_name, city, is_active')
          .eq('is_active', true)
          .ilike('display_name', `%${normalizedSearch}%`)
          .limit(50)
      : Promise.resolve({ data: null, error: null } as const),

    !normalizedSearch
      ? supabase
          .from('male_profile_reputation_summary')
          .select(
            'male_profile_id, average_rating, total_reviews, alert_count, classification'
          )
          .gt('total_reviews', 0)
          .order('average_rating', { ascending: false })
          .limit(60)
      : Promise.resolve({ data: null, error: null } as const),
  ])

  const totalAlerts = (allAlertsRes.data ?? []).reduce(
    (acc, row: any) => acc + safeNumber(row.alert_count),
    0
  )

  const stats: Stats = {
    total_profiles: statsProfilesRes.count ?? 0,
    total_reviews: statsReviewsRes.count ?? 0,
    total_alerts: totalAlerts,
  }

  let summaries: SummaryRow[] = []
  let profiles: MaleProfileRow[] = []

  if (normalizedSearch) {
    profiles = ((profileSearchRes as any).data ?? []) as MaleProfileRow[]

    if (!profiles.length) {
      return { perfis: [] as Perfil[], stats }
    }

    const ids = profiles.map((profile) => profile.id)

    const { data: summaryData } = await supabase
      .from('male_profile_reputation_summary')
      .select(
        'male_profile_id, average_rating, total_reviews, alert_count, classification'
      )
      .in('male_profile_id', ids)
      .gt('total_reviews', 0)

    summaries = (summaryData ?? []) as SummaryRow[]
  } else {
    summaries = (defaultSummaryRes.data ?? []) as SummaryRow[]

    if (!summaries.length) {
      return { perfis: [] as Perfil[], stats }
    }

    const ids = summaries.map((item) => item.male_profile_id)

    const { data: profilesData } = await supabase
      .from('male_profiles')
      .select('id, display_name, city, is_active')
      .in('id', ids)
      .eq('is_active', true)

    profiles = (profilesData ?? []) as MaleProfileRow[]
  }

  if (!summaries.length || !profiles.length) {
    return { perfis: [] as Perfil[], stats }
  }

  const summaryIds = summaries.map((item) => item.male_profile_id)

  const { data: reviewSignalsData } = await supabase
    .from('avaliacoes')
    .select('male_profile_id, created_at, relato, notas')
    .in('male_profile_id', summaryIds)
    .eq('publica', true)
    .order('created_at', { ascending: false })
    .limit(500)

  const reviewSignals = (reviewSignalsData ?? []) as ReviewSignalRow[]

  const reviewMap = new Map<string, ReviewSignalRow[]>()
  for (const review of reviewSignals) {
    const current = reviewMap.get(review.male_profile_id) ?? []
    current.push(review)
    reviewMap.set(review.male_profile_id, current)
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const perfis = summaries
    .map((summary) => {
      const profile = profileMap.get(summary.male_profile_id)
      if (!profile || profile.is_active === false) return null

      const averageRating = Number(
        safeNumber(summary.average_rating).toFixed(1)
      )
      const totalReviews = safeNumber(summary.total_reviews)
      const alertCount = safeNumber(summary.alert_count)

      const fraud = computeFraudSignals(reviewMap.get(summary.male_profile_id) ?? [])
      const weightedScore = computeWeightedScore({
        averageRating,
        totalReviews,
        alertCount,
        fraudScore: fraud.fraudScore,
      })

      return {
        id: profile.id,
        display_name: profile.display_name?.trim() || 'Perfil sem nome',
        city: profile.city?.trim() || 'Cidade não informada',
        average_rating: averageRating,
        total_reviews: totalReviews,
        alert_count: alertCount,
        classification: summary.classification ?? 'confiavel',
        weighted_score: weightedScore,
        fraud_score: fraud.fraudScore,
        fraud_level: fraud.fraudLevel,
      } satisfies Perfil
    })
    .filter((item): item is Perfil => Boolean(item))
    .sort((a, b) => {
      if (b.weighted_score !== a.weighted_score) {
        return b.weighted_score - a.weighted_score
      }
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating
      }
      return b.total_reviews - a.total_reviews
    })
    .slice(0, 20)

  return { perfis, stats }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?:
    | { search?: string | string[] }
    | Promise<{ search?: string | string[] }>
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const rawSearch = resolvedSearchParams?.search
  const search =
    typeof rawSearch === 'string' ? rawSearch : Array.isArray(rawSearch) ? rawSearch[0] ?? '' : ''

  const { perfis, stats } = await getHomeData(search)

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <Eye className="w-8 h-8 text-[#D4AF37]" />
              <Lock className="w-4 h-4 text-[#C0C0C0] absolute -bottom-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] bg-clip-text text-transparent">
              Confia+
            </h1>
          </div>

          <form action="/home" className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Buscar por nome..."
                className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </form>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4 text-center">
              <Shield className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.total_profiles}</p>
              <p className="text-xs text-gray-400">Perfis</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-4 text-center">
              <Star className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.total_reviews}</p>
              <p className="text-xs text-gray-400">Avaliações</p>
            </div>

            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.total_alerts}</p>
              <p className="text-xs text-gray-400">Alertas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            href="/avaliar"
            className="block w-full bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold py-4 rounded-xl text-center hover:opacity-90 transition-opacity"
          >
            + Avaliar um Homem
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
            {search ? `Resultados para "${search}"` : 'Perfis Recentes'}
          </h2>

          {perfis.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum perfil encontrado
            </div>
          ) : (
            perfis.map((perfil) => (
              <Link
                key={perfil.id}
                href={`/consultar-reputacao/${perfil.id}`}
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                      {perfil.display_name}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">{perfil.city}</p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getReputacaoColor(
                      perfil.classification
                    )}`}
                  >
                    {getReputacaoLabel(perfil.classification)}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                    <span className="text-sm font-semibold text-white">
                      {perfil.average_rating.toFixed(1)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-400">
                    {perfil.total_reviews} avaliações
                  </div>

                  <div className="text-sm text-gray-400">
                    {perfil.alert_count} alertas
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className={`px-2.5 py-1 rounded-full text-[11px] border ${getFraudColor(
                      perfil.fraud_level
                    )}`}
                  >
                    {getFraudLabel(perfil.fraud_level)}
                  </div>

                  <div className="px-2.5 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-gray-300">
                    Score {perfil.weighted_score.toFixed(1)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <Navbar />
    </div>
  )
}
