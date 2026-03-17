import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ShieldAlert } from 'lucide-react'
import { ReportReviewButton } from '@/components/ReportReviewButton'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'
import { PaywallCard } from '@/components/paywall/PaywallCard'

export const dynamic = 'force-dynamic'

const categorias = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

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

          <PaywallCard hasData={hasData} />
        </div>
      </div>
    )
  }

  const result = await getDetailedReputation(supabaseAdmin, id)

  if (result.status !== 200 || !result.data) {
    return <div className="text-white p-10">Erro ao carregar reputação</div>
  }

  const data = result.data
  const perfil = data.profile
  const mediaGeral = Number(data.reputation.average_rating ?? 0)
  const totalAvaliacoes = Number(data.reputation.total_reviews ?? 0)
  const somaEstrelas = mediaGeral * totalAvaliacoes
  const status = statusLabel(data.reputation.classification)

  const mediasCategorias = data.category_averages ?? {}
  const alertasOrdenados = data.alertas ?? []
  const relatos = data.relatos ?? []

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

          <h1 className="text-xl font-semibold">{perfil.display_name}</h1>
          <p className="text-gray-400 text-sm">{perfil.city ?? 'Cidade não informada'}</p>
        </div>

        <div className="mt-5 bg-[#111] border border-yellow-600/40 rounded-2xl p-6 text-center">
          <div className="flex justify-center items-center gap-2 text-yellow-400">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">{mediaGeral.toFixed(1)}</span>
          </div>

          <p className="text-sm text-gray-400 mt-2">{totalAvaliacoes} avaliações</p>

          <p className="text-xs text-gray-500 mt-1">Soma total das estrelas: {somaEstrelas.toFixed(1)}</p>
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
              {alertasOrdenados.map((item) => (
                <div
                  key={item.flag}
                  className="flex justify-between bg-black/40 p-3 rounded-lg border border-gray-800"
                >
                  <span className="text-red-300 capitalize">{item.flag.replaceAll('_', ' ')}</span>
                  <span className="text-xs text-gray-400">citado {item.count}x</span>
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
                  <span className="text-yellow-400">{value.toFixed(1)}/5</span>
                </div>

                <div className="w-full bg-gray-800 h-2 rounded-full">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${(value / 5) * 100}%`,
                    }}
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
              {relatos.map((a) => (
                <div key={a.id} className="bg-[#111] border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-yellow-400 text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {a.rating.toFixed(1)}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {a.review_text && <p className="text-sm text-gray-300 mt-3">{a.review_text}</p>}

                  {a.flags_negative.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {a.flags_negative.map((flag) => (
                        <span
                          key={flag}
                          className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-full border border-red-600/30"
                        >
                          {flag.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    {a.is_anonymous ? 'Avaliação anônima' : 'Avaliação identificada'}
                  </p>

                  <ReportReviewButton avaliacaoId={a.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/avaliar/${perfil.id}`}
          className="mt-10 block text-center bg-yellow-500 text-black font-bold py-3 rounded-xl"
        >
          Avaliar Este Perfil
        </Link>
      </div>
    </div>
  )
}
