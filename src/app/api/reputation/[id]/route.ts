import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ShieldAlert } from 'lucide-react'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { ReportReviewButton } from '@/components/ReportReviewButton'

type Avaliacao = {
  id: string
  created_at: string
  publica: boolean | null
  status: 'public' | 'pending_moderation' | 'hidden' | 'removed' | null
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
  relato: string | null
  notas: string | null
  flags_negative: string[] | null
  flags_positive: string[] | null
}

type CategoriaKey =
  | 'comportamento'
  | 'seguranca_emocional'
  | 'respeito'
  | 'carater'
  | 'confianca'

const categorias: Array<{ key: CategoriaKey; label: string }> = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
]

function toNumber(value: number | null | undefined) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0
}

function textoRelato(review: Avaliacao) {
  const texto = (review.relato ?? review.notas ?? '').trim()
  return texto.length > 0 ? texto : null
}

function reviewVisivel(review: Avaliacao) {
  const publica = review.publica !== false
  const statusOk =
    review.status === null ||
    review.status === undefined ||
    review.status === 'public' ||
    review.status === 'pending_moderation'

  return publica && statusOk
}

function formatarData(data: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(data))
  } catch {
    return data
  }
}

export default async function ConsultarReputacaoDetalhePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('has_active_plan, current_plan_id, subscription_status, free_queries_used')
    .eq('id', user.id)
    .maybeSingle()

  const hasPaidSubscription =
    profile?.has_active_plan === true ||
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'trialing' ||
    (typeof profile?.current_plan_id === 'string' &&
      profile.current_plan_id !== 'free')

  const freeQueriesUsed = profile?.free_queries_used ?? 0

  if (!hasPaidSubscription && freeQueriesUsed >= 3) {
    redirect('/planos')
  }

  const maleProfileId = params.id

  const { data: maleProfile, error: maleProfileError } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', maleProfileId)
    .single()

  if (maleProfileError || !maleProfile) {
    redirect('/consultar-reputacao')
  }

  const { data: rawReviews, error: reviewsError } = await supabaseAdmin
    .from('avaliacoes')
    .select(`
      id,
      created_at,
      publica,
      status,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      relato,
      notas,
      flags_negative,
      flags_positive
    `)
    .eq('male_profile_id', maleProfileId)
    .order('created_at', { ascending: false })

  if (reviewsError) {
    console.error('Erro ao carregar avaliações no detalhe da reputação:', reviewsError)
  }

  const reviews = ((rawReviews ?? []) as Avaliacao[]).filter(reviewVisivel)

  const totalReviews = reviews.length

  const somaCategorias = {
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  }

  let somaMedias = 0
  let totalAlertas = 0

  for (const review of reviews) {
    const comportamento = toNumber(review.comportamento)
    const segurancaEmocional = toNumber(review.seguranca_emocional)
    const respeito = toNumber(review.respeito)
    const carater = toNumber(review.carater)
    const confianca = toNumber(review.confianca)

    somaCategorias.comportamento += comportamento
    somaCategorias.seguranca_emocional += segurancaEmocional
    somaCategorias.respeito += respeito
    somaCategorias.carater += carater
    somaCategorias.confianca += confianca

    somaMedias +=
      (comportamento + segurancaEmocional + respeito + carater + confianca) / 5

    if (Array.isArray(review.flags_negative) && review.flags_negative.length > 0) {
      totalAlertas += 1
    }
  }

  const mediaGeral = totalReviews > 0 ? somaMedias / totalReviews : 0

  const mediasCategoria = {
    comportamento:
      totalReviews > 0 ? somaCategorias.comportamento / totalReviews : 0,
    seguranca_emocional:
      totalReviews > 0 ? somaCategorias.seguranca_emocional / totalReviews : 0,
    respeito: totalReviews > 0 ? somaCategorias.respeito / totalReviews : 0,
    carater: totalReviews > 0 ? somaCategorias.carater / totalReviews : 0,
    confianca: totalReviews > 0 ? somaCategorias.confianca / totalReviews : 0,
  }

  const relatos = reviews
    .map((review) => ({
      texto: textoRelato(review),
      created_at: review.created_at,
    }))
    .filter((item): item is { texto: string; created_at: string } => Boolean(item.texto))

  let classificacao = 'Sem avaliações'
  let badgeClasse = 'bg-zinc-700 text-white'

  if (totalReviews > 0) {
    if (totalAlertas > 0 || mediaGeral < 2.5) {
      classificacao = 'Perigo'
      badgeClasse = 'bg-red-600 text-white'
    } else if (mediaGeral < 3.5) {
      classificacao = 'Atenção'
      badgeClasse = 'bg-yellow-500 text-black'
    } else if (mediaGeral < 4.5) {
      classificacao = 'Bom'
      badgeClasse = 'bg-blue-600 text-white'
    } else {
      classificacao = 'Excelente'
      badgeClasse = 'bg-green-600 text-white'
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <div className="mx-auto max-w-md space-y-5">
        <Link href="/consultar-reputacao" className="text-sm text-zinc-300 hover:text-white">
          ← Voltar
        </Link>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{maleProfile.display_name}</h1>
              <p className="mt-1 text-zinc-400">{maleProfile.city || 'Cidade não informada'}</p>
            </div>

            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeClasse}`}>
              {classificacao}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-700/40 bg-zinc-950 p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <Star className="h-8 w-8 fill-current" />
            <span className="text-6xl font-bold">{mediaGeral.toFixed(1)}</span>
          </div>

          <p className="mt-3 text-lg text-zinc-200">
            {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            Soma total das estrelas: {somaMedias.toFixed(1)}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Alertas de Segurança</h2>
          </div>

          <p className="mt-3 text-zinc-300">
            {totalAlertas > 0
              ? `${totalAlertas} ${totalAlertas === 1 ? 'alerta registrado' : 'alertas registrados'}.`
              : 'Nenhum alerta registrado.'}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold text-yellow-400">Média por Categoria</h2>

          <div className="mt-5 space-y-5">
            {categorias.map(({ key, label }) => {
              const valor = mediasCategoria[key]
              const porcentagem = Math.max(0, Math.min(100, (valor / 5) * 100))

              return (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-lg text-zinc-100">{label}</span>
                    <span className="text-lg font-semibold text-yellow-400">
                      {valor.toFixed(1)}/5
                    </span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-[#1f2d5c]">
                    <div
                      className="h-3 rounded-full bg-yellow-400 transition-all"
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-yellow-400">Relatos das Usuárias</h2>

          <div className="mt-4 space-y-4">
            {relatos.length === 0 ? (
              <p className="text-zinc-400">Ainda não há relatos.</p>
            ) : (
              relatos.map((item, index) => (
                <article
                  key={`${item.created_at}-${index}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <p className="whitespace-pre-wrap text-zinc-100">{item.texto}</p>
                  <p className="mt-3 text-xs text-zinc-500">{formatarData(item.created_at)}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="pt-2">
          <Link
            href={`/avaliar/${maleProfile.id}`}
            className="flex w-full items-center justify-center rounded-2xl bg-yellow-500 px-5 py-4 text-lg font-bold text-black hover:bg-yellow-400"
          >
            Avaliar Este Perfil
          </Link>
        </div>

        <div className="pt-2">
          <ReportReviewButton maleProfileId={maleProfile.id} />
        </div>
      </div>
    </main>
  )
}
