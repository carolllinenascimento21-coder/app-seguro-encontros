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

const TRUST_LABELS = [
  'Usuária verificada',
  'Relato confidencial',
  'Experiência real',
  'Depoimento validado',
] as const

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

  const result = await getDetailedReputation(supabaseAdmin, id)

  if (!result || result.status !== 200 || !result.data) {
    return <div className="text-white p-10">Erro ao carregar reputação</div>
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
          <div
            className={`absolute top-4 right-4 px-3 py-1 text-xs rounded-full text-white ${status.color}`}
          >
            {status.text}
          </div>

          <h1 className="text-xl font-semibold">{perfil.display_name ?? 'Perfil sem nome'}</h1>
          <p className="text-gray-400 text-sm">{perfil.city ?? 'Cidade não informada'}</p>
        </div>

        <div className="mt-5 bg-[#111] border border-yellow-600/40 rounded-2xl p-6 text-center">
          <div className="flex justify-center items-center gap-2 text-yellow-400">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {Number.isFinite(mediaGeral) ? mediaGeral.toFixed(1) : '0.0'}
            </span>
          </div>

          <p className="text-sm text-gray-400 mt-2">{totalAvaliacoes} avaliações</p>

          <p className="text-xs text-gray-500 mt-1">
            Soma total das estrelas: {Number.isFinite(somaEstrelas) ? somaEstrelas.toFixed(1) : '0.0'}
          </p>
        </div>

        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <ShieldAlert size={16} />
            Alertas de Segurança
          </div>

          {alertasOrdenados.length === 0 ? (
            <p className="text-gray-500 text-sm mt-3">Nenhum alerta registrado.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {alertasOrdenados.map((item, index) => (
                <div
                  key={item?.flag ?? `alerta-${index}`}
                  className="flex justify-between bg-black/40 p-3 rounded-lg border border-gray-800"
                >
                  <span className="text-red-300 capitalize">
                    {String(item?.flag ?? 'alerta').replaceAll('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    citado {Number(item?.count ?? 0)}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-yellow-400 font-semibold mb-4">Média por Categoria</h2>

          {categorias.map((cat) => {
            const value = Number(mediasCategorias[cat.key as keyof typeof mediasCategorias] ?? 0)

            return (
              <div key={cat.key} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>{cat.label}</span>
                  <span className="text-yellow-400">
                    {Number.isFinite(value) ? value.toFixed(1) : '0.0'}/5
                  </span>
                </div>

                <div className="w-full bg-gray-800 h-2 rounded-full">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${(value / 5) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <h2 className="text-yellow-400 font-semibold mb-4">Relatos das Usuárias</h2>

          {relatos.length === 0 ? (
            <div className="text-gray-500 text-sm">Ainda não há relatos.</div>
          ) : (
            <div className="space-y-4">
              {relatos.map((a, index) => {
                const label = getTrustLabel(
                  typeof a?.id === 'string' ? a.id : String(index),
                  Boolean(a?.is_anonymous)
                )

                return (
                  <div
                    key={a?.id ?? `relato-${index}`}
                    className="bg-[#111] border border-gray-800 p-5 rounded-2xl"
                  >
                    <div className="flex justify-between items-center text-yellow-400 text-sm font-semibold">
                      <div className="flex items-center gap-1">
                        <Star size={14} fill="currentColor" />
                        {Number.isFinite(Number(a?.rating)) ? Number(a?.rating).toFixed(1) : '0.0'}
                      </div>

                      <span className="text-xs text-gray-400">
                        {a?.created_at
                          ? new Date(a.created_at).toLocaleDateString('pt-BR')
                          : 'Data indisponível'}
                      </span>
                    </div>

                    {a?.review_text && <p className="text-sm text-gray-300 mt-3">{a.review_text}</p>}

                    {Array.isArray(a?.flags_negative) && a.flags_negative.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {a.flags_negative.map((flag: string) => (
                          <span
                            key={flag}
                            className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-full border border-red-600/30"
                          >
                            {flag.replaceAll('_', ' ')}
                          </span>
                        ))}
                      </div>
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
