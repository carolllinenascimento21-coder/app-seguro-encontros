import Link from 'next/link'
import { Eye, Lock, Shield, AlertTriangle, Star } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const revalidate = 60

type Classification = 'perigo' | 'atencao' | 'confiavel' | 'excelente'

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

type Perfil = {
  id: string
  display_name: string
  city: string
  average_rating: number
  total_reviews: number
  alert_count: number
  classification: Classification
}

const safeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

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

async function getHomePerfis(): Promise<Perfil[]> {
  const supabase = getSupabaseAdminClient()

  const { data: summaryData, error: summaryError } = await supabase
    .from('male_profile_reputation_summary')
    .select('male_profile_id, average_rating, total_reviews, alert_count, classification')
    .gt('total_reviews', 0)
    .order('average_rating', { ascending: false })
    .limit(20)

  if (summaryError || !summaryData?.length) {
    console.error('Erro ao buscar resumo dos perfis:', summaryError)
    return []
  }

  const summaries = summaryData as SummaryRow[]
  const ids = summaries.map((item) => item.male_profile_id).filter(Boolean)

  const { data: maleProfilesData, error: maleProfilesError } = await supabase
    .from('male_profiles')
    .select('id, display_name, city, is_active')
    .in('id', ids)

  if (maleProfilesError) {
    console.error('Erro ao buscar male_profiles:', maleProfilesError)
    return []
  }

  const profiles = (maleProfilesData ?? []) as MaleProfileRow[]
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const perfis = summaries
    .map((summary) => {
      const profile = profileMap.get(summary.male_profile_id)
      if (!profile || profile.is_active === false) return null

      return {
        id: profile.id,
        display_name: profile.display_name?.trim() || 'Perfil sem nome',
        city: profile.city?.trim() || 'Cidade não informada',
        average_rating: Number(safeNumber(summary.average_rating).toFixed(1)),
        total_reviews: safeNumber(summary.total_reviews),
        alert_count: safeNumber(summary.alert_count),
        classification: summary.classification ?? 'confiavel',
      } satisfies Perfil
    })
    .filter((item): item is Perfil => Boolean(item))

  return perfis
}

export default async function HomePage() {
  const perfis = await getHomePerfis()

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

          <div className="w-full bg-white/5 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-gray-500">
            Busca será conectada aos dados reais na próxima etapa
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{perfis.length}</p>
            <p className="text-xs text-gray-400">Perfis</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {perfis.reduce((acc, perfil) => acc + perfil.total_reviews, 0)}
            </p>
            <p className="text-xs text-gray-400">Avaliações</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {perfis.reduce((acc, perfil) => acc + perfil.alert_count, 0)}
            </p>
            <p className="text-xs text-gray-400">Alertas</p>
          </div>
        </div>

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
            Perfis Recentes
          </h2>

          {perfis.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum perfil com avaliações encontrado
            </div>
          ) : (
            perfis.map((perfil) => (
              <Link
                key={perfil.id}
                href={`/consultar-reputacao/${perfil.id}`}
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
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

                {perfil.alert_count > 0 && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-400">
                      {perfil.alert_count} alerta(s) ativo(s)
                    </span>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      <Navbar />
    </div>
  )
}
