import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ShieldAlert } from 'lucide-react'
import { ReportReviewButton } from '@/components/ReportReviewButton'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'
import { PremiumDetailLock } from '@/components/paywall/PremiumDetailLock'

export const dynamic = 'force-dynamic'

const categorias = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

// 🔥 NOVO — Labels dinâmicos
const TRUST_LABELS = [
  'Usuária verificada',
  'Relato confidencial',
  'Experiência real',
  'Depoimento validado',
]

function getTrustLabel(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TRUST_LABELS[Math.abs(hash) % TRUST_LABELS.length]
}

function statusLabel(classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente') {
  if (classification === 'excelente') return { text: 'Excelente', color: 'bg-green-600' }
  if (classification === 'confiavel') return { text: 'Confiável', color: 'bg-yellow-600' }
  if (classification === 'atencao') return { text: 'Atenção', color: 'bg-orange-600' }
  return { text: 'Perigo', color: 'bg-red-600' }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return <div className="text-white p-10">Serviço indisponível</div>
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('current_plan_id')
    .eq('id', user.id)
    .maybeSingle()

  const isPremiumUser = (me?.current_plan_id ?? 'free') !== 'free'

  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', id)
    .maybeSingle()

  if (maleProfileError || !maleProfile) {
    return <div className="text-white p-10">Perfil não encontrado</div>
  }

  if (!isPremiumUser) {
    const { data: summary } = await supabaseAdmin
      .from('male_profile_reputation_summary')
      .select('total_reviews, alert_count')
      .eq('male_profile_id', id)
      .maybeSingle()

    const hasData = Number(summary?.total_reviews ?? 0) > 0 || Number(summary?.alert_count ?? 0) > 0

    return (
      <div className="min-h-screen bg-black text-white pb-20">
        <div className="max-w-md mx-auto px-4 pt-6">
          <Link href="/consultar-reputacao" className="text-gray-400 text-sm">
            ← Voltar
          </Link>

          <div className="mt-4 bg-[#111] p-5 rounded-2xl border border-gray-800">
            <h1 className="text-xl font-semibold">{maleProfile.display_name}</h1>
            <p className="text-gray-400 text-sm">{maleProfile.city ?? 'Cidade não informada'}</p>
          </div>

          <PremiumDetailLock hasData={hasData} />
        </div>
      </div>
    )
  }

  const result = await getDetailedReputation(supabaseAdmin, id)

  if (!result || result.status !== 200 || !result.data) {
    return <div className="text-white p-10">Erro ao carregar reputação</div>
  }

  const data = result?.data ?? {}
  const perfil = data?.profile ?? {}
  const reputation = data?.reputation ?? {}
  const mediaGeral = Number(reputation?.average_rating ?? 0)
  const totalAvaliacoes = Number(reputation?.total_reviews ?? 0)

  const status = statusLabel(
    reputation?.classification === 'excelente' ||
      reputation?.classification === 'confiavel' ||
      reputation?.classification === 'atencao' ||
      reputation?.classification === 'perigo'
      ? reputation.classification
      : 'confiavel'
  )

  const mediasCategorias = data.category_averages ?? {}
  const alertasOrdenados = Array.isArray(data?.alertas)
    ? data.alertas
    : Array.isArray(data?.alerts)
      ? data.alerts
      : []
  const relatos = Array.isArray(data?.relatos)
    ? data.relatos
    : Array.isArray(data?.reviews)
      ? data.reviews
      : []

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/consultar-reputacao" className="text-gray-400 text-sm">
          ← Voltar
        </Link>

        <div className="mt-4 bg-[#111] p-5 rounded-2xl border border-gray-800 relative">
          <div className={`absolute top-4 right-4 px-3 py-1 text-xs rounded-full text-white ${status.color}`}>
            {status.text}
          </div>

          <h1 className="text-xl font-semibold">{perfil.display_name ?? 'Perfil sem nome'}</h1>
          <p className="text-gray-400 text-sm">{perfil.city ?? 'Cidade não informada'}</p>
        </div>

        <div className="mt-6">
          <h2 className="text-yellow-400 font-semibold mb-4">Relatos das Usuárias</h2>

          {relatos.length === 0 ? (
            <div className="text-gray-500 text-sm">Ainda não há relatos.</div>
          ) : (
            <div className="space-y-4">
              {relatos.map((a, index) => (
                <div key={a?.id ?? index} className="bg-[#111] border border-gray-800 p-5 rounded-2xl">

                  <div className="flex justify-between items-center text-yellow-400 text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {Number(a?.rating ?? 0).toFixed(1)}
                    </div>
                    <span className="text-xs text-gray-400">
                      {a?.created_at
                        ? new Date(a.created_at).toLocaleDateString('pt-BR')
                        : ''}
                    </span>
                  </div>

                  {a?.review_text && (
                    <p className="text-sm text-gray-300 mt-3">
                      {a.review_text}
                    </p>
                  )}

                  {/* 🔥 BADGE NOVO */}
                  <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-green-400 text-[10px]">✔</span>
                    <span className="text-[10px] text-gray-300">
                      {getTrustLabel(a?.id ?? String(index))}
                    </span>
                  </div>

                  {typeof a?.id === 'string' && (
                    <ReportReviewButton avaliacaoId={a.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/avaliar/${perfil.id ?? id}`}
          className="mt-10 block text-center bg-yellow-500 text-black font-bold py-3 rounded-xl"
        >
          Avaliar Este Perfil
        </Link>
      </div>
    </div>
  )
}
