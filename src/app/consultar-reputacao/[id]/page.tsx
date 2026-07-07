import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Star, ShieldAlert } from 'lucide-react'
import { ReportReviewButton } from '@/components/ReportReviewButton'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getDetailedReputation } from '@/lib/reputation/detail'

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
]

function getTrustLabel(id: string, isAnonymous?: boolean) {
  if (!isAnonymous) return 'Avaliação identificada'

  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  return TRUST_LABELS[Math.abs(hash) % TRUST_LABELS.length]
}


function humanizeFlag(flag: string) {
  return flag
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function renderRatingStars(value: number) {
  const rounded = Math.round(value)
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={14}
      fill={index < rounded ? 'currentColor' : 'none'}
      className={index < rounded ? 'text-yellow-400' : 'text-gray-700'}
    />
  ))
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
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return <div className="text-white p-10">Serviço indisponível</div>
  }

  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', id)
    .maybeSingle()

  if (maleProfileError || !maleProfile) {
    return <div className="text-white p-10">Perfil não encontrado</div>
  }

  let jaAvaliei = false
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))

  if (hasAuthCookie) {
    try {
      const supabase = await createServerClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.warn('Sessão inválida ignorada ao consultar reputação pública', userError.message)
      }

      if (user?.id) {
        const { data: minhaAvaliacao, error: minhaAvaliacaoError } = await supabaseAdmin
          .from('avaliacoes')
          .select('id')
          .eq('user_id', user.id)
          .or(`male_profile_id.eq.${id},avaliado_id.eq.${id}`)
          .maybeSingle()

        if (minhaAvaliacaoError) {
          console.warn('Erro opcional ao verificar avaliação da usuária', minhaAvaliacaoError.message)
        }

        jaAvaliei = Boolean(minhaAvaliacao?.id)
      }
    } catch (error) {
      console.warn('Sessão inválida ignorada na consulta pública de reputação', error)
    }
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

  const relatos = Array.isArray(data?.reviews)
    ? data.reviews
    : Array.isArray(data?.relatos)
      ? data.relatos
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

        {/* RESUMO DAS AVALIAÇÕES */}
        <div className="mt-6 bg-[#111] border border-yellow-600/30 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-yellow-400 font-semibold">Resumo das Avaliações</h2>
              <p className="text-xs text-gray-500 mt-1">
                Média por critério calculada sobre todas as avaliações públicas.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">{mediaGeral.toFixed(1)}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">média geral</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {categorias.map((categoria) => {
              const average = Number(mediasCategorias?.[categoria.key] ?? 0)

              return (
                <div key={categoria.key} className="bg-black/40 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-200">{categoria.label}</span>
                    <span className="text-sm font-semibold text-yellow-400">{average.toFixed(1)}/5</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">{renderRatingStars(average)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ALERTAS */}
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
          <h2 className="text-yellow-400 font-semibold mb-4">Relatos das Usuárias</h2>

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

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {categorias.map((categoria) => {
                    const value = Number(a?.[categoria.key] ?? 0)

                    return (
                      <div key={categoria.key} className="flex items-center justify-between gap-3 text-xs bg-black/30 border border-gray-800 rounded-lg px-3 py-2">
                        <span className="text-gray-400">{categoria.label}</span>
                        <span className="flex items-center gap-2 text-yellow-400 font-semibold">
                          <span className="flex gap-0.5">{renderRatingStars(value)}</span>
                          {value.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {Array.isArray(a?.flags_positive) && a.flags_positive.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-green-400">Green Flags selecionadas</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.flags_positive.map((flag: string) => (
                        <span key={flag} className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] text-green-200">
                          {humanizeFlag(flag)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(a?.flags_negative) && a.flags_negative.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-red-400">Red Flags selecionadas</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.flags_negative.map((flag: string) => (
                        <span key={flag} className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                          {humanizeFlag(flag)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-xs font-semibold text-yellow-400">Relato da usuária</div>
                  {a?.review_text ? (
                    <p className="text-sm text-gray-300 mt-2">{a.review_text}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">Nenhum relato textual informado.</p>
                  )}
                </div>

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
