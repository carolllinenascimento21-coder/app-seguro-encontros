import Link from 'next/link'
import { Eye, Lock, Shield, AlertTriangle, Star, Search } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export const revalidate = 60

type Classification = 'perigo' | 'atencao' | 'confiavel' | 'excelente'

type Perfil = {
  id: string
  display_name: string
  city: string
  average_rating: number
  total_reviews: number
  alert_count: number
  classification: Classification
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
      return ''
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
      return ''
  }
}

async function getHomeData(search?: string) {
  const supabase = getSupabaseAdminClient()

  // 🔥 EXECUTA EM PARALELO (performance)
  const [summaryRes, statsProfilesRes, statsReviewsRes] = await Promise.all([

    // PERFIS
    supabase
      .from('male_profile_reputation_summary')
      .select('male_profile_id, average_rating, total_reviews, alert_count, classification')
      .gt('total_reviews', 0)
      .order('average_rating', { ascending: false })
      .limit(50),

    // TOTAL DE PERFIS
    supabase
      .from('male_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // TOTAL DE AVALIAÇÕES
    supabase
      .from('avaliacoes')
      .select('id', { count: 'exact', head: true })
      .eq('publica', true),
  ])

  const summaryData = summaryRes.data || []

  const ids = summaryData.map((item) => item.male_profile_id)

  // PERFIS DETALHADOS
  let query = supabase
    .from('male_profiles')
    .select('id, display_name, city, is_active')
    .in('id', ids)
    .eq('is_active', true)

  if (search && search.trim() !== '') {
    query = query.ilike('display_name', `%${search}%`)
  }

  const { data: profilesData } = await query

  const profileMap = new Map(
    (profilesData ?? []).map((p) => [p.id, p])
  )

  const perfis: Perfil[] = summaryData
    .map((summary: any) => {
      const profile = profileMap.get(summary.male_profile_id)
      if (!profile) return null

      return {
        id: profile.id,
        display_name: profile.display_name ?? 'Sem nome',
        city: profile.city ?? 'Sem cidade',
        average_rating: Number(safeNumber(summary.average_rating).toFixed(1)),
        total_reviews: safeNumber(summary.total_reviews),
        alert_count: safeNumber(summary.alert_count),
        classification: summary.classification ?? 'confiavel',
      }
    })
    .filter(Boolean) as Perfil[]

  // 🔥 ALERTAS GLOBAIS (derivado)
  const totalAlerts = summaryData.reduce(
    (acc, item: any) => acc + safeNumber(item.alert_count),
    0
  )

  const stats: Stats = {
    total_profiles: statsProfilesRes.count || 0,
    total_reviews: statsReviewsRes.count || 0,
    total_alerts: totalAlerts,
  }

  return { perfis, stats }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { search?: string }
}) {
  const search = searchParams?.search || ''
  const { perfis, stats } = await getHomeData(search)

  return (
    <div className="min-h-screen bg-black text-white pb-20">

      {/* HEADER */}
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

          {/* BUSCA REAL */}
          <form>
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

        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="max-w-md mx-auto px-4 py-6">

        {/* 🔥 STATS ENTERPRISE */}
        <div className="grid grid-cols-3 gap-3 mb-6">

          <div className="bg-gradient-to-br from-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_profiles}</p>
            <p className="text-xs text-gray-400">Perfis</p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_reviews}</p>
            <p className="text-xs text-gray-400">Avaliações</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_alerts}</p>
            <p className="text-xs text-gray-400">Alertas</p>
          </div>

        </div>

        {/* LISTA */}
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
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition"
              >
                <div className="flex justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{perfil.display_name}</h3>
                    <p className="text-sm text-gray-400">{perfil.city}</p>
                  </div>

                  <div
                    className={`px-3 py-1 text-xs rounded-full border ${getReputacaoColor(
                      perfil.classification
                    )}`}
                  >
                    {getReputacaoLabel(perfil.classification)}
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                    {perfil.average_rating.toFixed(1)}
                  </div>
                  <div>{perfil.total_reviews} avaliações</div>
                  <div>{perfil.alert_count} alertas</div>
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
