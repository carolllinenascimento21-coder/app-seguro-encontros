import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Star, ShieldAlert, ShieldCheck, Heart } from 'lucide-react'
import { ReportReviewButton } from '@/components/ReportReviewButton'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'
import { PremiumDetailLock } from '@/components/paywall/PremiumDetailLock'
import {
  canUseFreeReputationQuery,
  getFreeReputationQueriesUsed,
  hasPaidReputationAccess,
} from '@/lib/reputation/access-control'

export const dynamic = 'force-dynamic'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  current_plan_id: string | null
  subscription_status: string | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS =
  'has_active_plan, current_plan_id, subscription_status, free_queries_used'

const categorias = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

const TRUST_LABELS = [
  'Usuária verificada',
  'Relato confidencial',
  'Experiência real',
  'Depoimento validado',
]

function getTrustLabel(id: string, isAnonymous?: boolean) {
  if (!isAnonymous) return 'Avaliação identificada'

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

  let jaAvaliei = false
  let me: ProfileAccessRow | null = null

  if (user) {
    // 🔥 NOVO — verifica se já avaliou
    const { data: minhaAvaliacao } = await supabase
      .from('avaliacoes')
      .select('id')
      .eq('user_id', user.id)
      .eq('male_profile_id', id)
      .maybeSingle()

    jaAvaliei = Boolean(minhaAvaliacao?.id)

    const { data: profileAccess, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_ACCESS_FIELDS)
      .eq('id', user.id)
      .maybeSingle<ProfileAccessRow>()

    if (profileError) {
      console.error('Erro ao validar acesso no detalhe de reputação', profileError)
      return <div className="text-white p-10">Erro ao validar acesso</div>
    }

    me = profileAccess
  }

  const isPremiumUser = hasPaidReputationAccess(me)
  let canViewFullReputation = !user || isPremiumUser

  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', id)
    .maybeSingle()

  if (maleProfileError || !maleProfile) {
    return <div className="text-white p-10">Perfil não encontrado</div>
  }

  if (user && !isPremiumUser && canUseFreeReputationQuery(me)) {
    const nextFreeQueriesUsed = getFreeReputationQueriesUsed(me) + 1
    const { error: consumeError } = await supabaseAdmin
      .from('profiles')
      .update({ free_queries_used: nextFreeQueriesUsed })
      .eq('id', user.id)

    if (consumeError) {
      console.error('Erro ao consumir consulta gratuita de reputação', consumeError)
      return <div className="text-white p-10">Erro ao validar acesso</div>
    }

    const { error: consultaError } = await supabaseAdmin
      .from('consultas')
      .insert({ user_id: user.id })

    if (consultaError) {
      console.error('Erro ao registrar consulta gratuita de reputação', consultaError)
    }

    canViewFullReputation = true
  }

  if (!canViewFullReputation) {
    const { data: summary } = await supabaseAdmin
      .from('male_profile_reputation_summary')
      .select('total_reviews, alert_count')
      .eq('male_profile_id', id)
      .maybeSingle()

    const hasData =
      Number(summary?.total_reviews ?? 0) > 0 || Number(summary?.alert_count ?? 0) > 0

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

  const result = await getDetailedReputation(supabaseAdmin, id).catch((error) => {
    console.error('Erro inesperado ao carregar reputação pública', error)
    return null
  })

  if (!result || result.status !== 200 || !result.data) {
    return <div className="min-h-screen bg-black text-white p-10">Erro ao carregar reputação</div>
  }

  const data = result.data ?? {}
  const perfil = data.profile ?? {}
  const reputation = data.reputation ?? {}

  const mediaGeral = Number(reputation?.average_rating ?? 0)
  const totalAvaliacoes = Number(reputation?.total_reviews ?? 0)
  const somaEstrelas = mediaGeral * totalAvaliacoes

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

  const { data: flagRows, error: flagRowsError } = await supabaseAdmin
    .from('avaliacoes')
    .select('flags_positive, flags_negative')
    .eq('male_profile_id', id)
    .eq('publica', true)

  if (flagRowsError) {
    console.error('Erro ao carregar flags públicas do perfil', flagRowsError)
  }

  const countFlags = (field: 'flags_positive' | 'flags_negative') => {
    const counts = new Map<string, number>()

    for (const row of flagRows ?? []) {
      const flags = Array.isArray(row?.[field]) ? row[field] : []
      for (const rawFlag of flags) {
        const normalized = String(rawFlag ?? '').trim()
        if (!normalized) continue
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      }
    }

    return [...counts.entries()]
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count || a.flag.localeCompare(b.flag))
  }

  const greenFlags = countFlags('flags_positive')
  const redFlags = countFlags('flags_negative')
  const redFlagsDisplay = redFlags.length > 0 ? redFlags : alertasOrdenados

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

        {/* HEADER */}
        <div className="mt-4 bg-[#111] p-5 rounded-2xl border border-gray-800 relative">
          <div className={`absolute top-4 right-4 px-3 py-1 text-xs rounded-full text-white ${status.color}`}>
            {status.text}
          </div>

          <h1 className="text-xl font-semibold">{perfil.display_name ?? 'Perfil sem nome'}</h1>
          <p className="text-gray-400 text-sm">{perfil.city ?? 'Cidade não informada'}</p>
        </div>

        {/* MÉDIA */}
        <div className="mt-5 bg-[#111] border border-yellow-600/40 rounded-2xl p-6 text-center">
          <div className="flex justify-center items-center gap-2 text-yellow-400">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {mediaGeral.toFixed(1)}
            </span>
          </div>

          <p className="text-sm text-gray-400 mt-2">{totalAvaliacoes} avaliações</p>
          <p className="text-xs text-gray-500 mt-1">
            Soma total das estrelas: {somaEstrelas.toFixed(1)}
          </p>
        </div>


        {/* MÉDIAS POR CRITÉRIO */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-yellow-400 font-semibold mb-4">Médias por critério</h2>

          <div className="space-y-3">
            {categorias.map((categoria) => {
              const value = Number(mediasCategorias?.[categoria.key] ?? 0)
              const percentage = Math.max(0, Math.min(100, (value / 5) * 100))

              return (
                <div key={categoria.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{categoria.label}</span>
                    <span className="text-yellow-400 font-semibold">{value.toFixed(1)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* GREEN FLAGS */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <ShieldCheck size={16} />
            Green flags
          </div>

          {greenFlags.length === 0 ? (
            <p className="text-gray-500 text-sm mt-3">Nenhuma green flag registrada.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {greenFlags.map((item) => (
                <span key={item.flag} className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-200">
                  {item.flag.replaceAll('_', ' ')} · {item.count}x
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RED FLAGS */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <ShieldAlert size={16} />
            Red flags e alertas de segurança
          </div>

          {redFlagsDisplay.length === 0 ? (
            <p className="text-gray-500 text-sm mt-3">Nenhuma red flag registrada.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {redFlagsDisplay.map((item, index) => (
                <div key={index} className="flex justify-between bg-black/40 p-3 rounded-lg border border-gray-800">
                  <span className="text-red-300 capitalize">
                    {String(item?.flag ?? '').replaceAll('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    citado {Number(item?.count ?? 0)}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RELATOS */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-4">
            <Heart size={16} />
            Relatos das Usuárias
          </div>

          {relatos.length === 0 && (
            <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl mb-4 text-sm text-gray-400">
              Nenhum relato público registrado para este perfil.
            </div>
          )}

          {relatos.map((a, index) => {
            const label = getTrustLabel(
              typeof a?.id === 'string' ? a.id : String(index),
              Boolean(a?.is_anonymous)
            )

            return (
              <div key={index} className="bg-[#111] border border-gray-800 p-5 rounded-2xl mb-4">
                <div className="flex justify-between text-yellow-400 text-sm font-semibold">
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    {Number(a?.rating ?? 0).toFixed(1)}
                  </div>

                  <span className="text-xs text-gray-400">
                    {a?.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>

                {a?.review_text && (
                  <p className="text-sm text-gray-300 mt-3">{a.review_text}</p>
                )}

                <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-green-400 text-[10px]">✔</span>
                  <span className="text-[10px] text-gray-300">{label}</span>
                </div>

                {typeof a?.id === 'string' && <ReportReviewButton avaliacaoId={a.id} />}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-500 mb-3">
         Conteúdos gerados por usuárias. Sujeitos à moderação e remoção conforme nossos termos.
        </p>

        <p className="text-xs text-gray-500 mt-8 text-center">
          As avaliações refletem opiniões pessoais das usuárias e não constituem afirmações de fato verificadas.
        </p>
        
        {/* BOTÃO INTELIGENTE */}
        <Link
          href={jaAvaliei ? `/minhas-avaliacoes` : `/avaliar/${perfil.id ?? id}`}
          className="mt-10 block text-center bg-yellow-500 text-black font-bold py-3 rounded-xl"
        >
          {jaAvaliei ? 'Editar Minha Avaliação' : 'Avaliar Este Perfil'}
        </Link>
      </div>
    </div>
  )
}
