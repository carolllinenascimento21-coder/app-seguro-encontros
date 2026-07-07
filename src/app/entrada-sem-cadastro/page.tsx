'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Lock, Search, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseClient } from '@/lib/supabase'

type GuestResult = {
  male_profile_id: string
  name: string
  city: string | null
  has_data: boolean
  total_reviews: number
  average_rating: number
  alert_count: number
  classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente'
  locked: true
}

const BADGE_LABELS: Record<GuestResult['classification'], string> = {
  perigo: 'Sinais de perigo',
  atencao: 'Atenção recomendada',
  confiavel: 'Sem alerta crítico',
  excelente: 'Boa reputação',
}

const BADGE_STYLES: Record<GuestResult['classification'], string> = {
  perigo: 'border-red-500/30 bg-red-500/10 text-red-300',
  atencao: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  confiavel: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  excelente: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
}

const ratingFields = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type RatingKey = (typeof ratingFields)[number]['key']

export default function EntradaSemCadastroPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'consultar' | 'avaliar'>('consultar')
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [results, setResults] = useState<GuestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [reviewName, setReviewName] = useState('')
  const [reviewCity, setReviewCity] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })
  const [publishing, setPublishing] = useState(false)
  const [publishedProfileId, setPublishedProfileId] = useState<string | null>(null)

  const buscar = async () => {
    const nomeBusca = nome.trim()
    const cidadeBusca = cidade.trim()

    if (!nomeBusca && !cidadeBusca) {
      alert('Digite nome ou cidade para consultar.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setHasSearched(true)
      setResults([])

      const params = new URLSearchParams()
      if (nomeBusca) params.set('nome', nomeBusca)
      if (cidadeBusca) params.set('cidade', cidadeBusca)

      const response = await fetch(`/api/reputation/public-search?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message ?? 'Erro na consulta')
      }

      setResults(data.results ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Erro na consulta')
    } finally {
      setLoading(false)
    }
  }

  const publishGuestReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) {
      alert('Preencha o nome da pessoa avaliada e um relato resumido.')
      return
    }

    if (Object.values(ratings).some((rating) => rating <= 0)) {
      alert('Preencha todas as notas para publicar a avaliação.')
      return
    }

    const supabase = createSupabaseClient()

    if (!supabase) {
      alert('Serviço indisponível no momento. Tente novamente mais tarde.')
      return
    }

    try {
      setPublishing(true)
      setPublishedProfileId(null)

      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        const { error: anonymousError } = await supabase.auth.signInAnonymously()

        if (anonymousError) {
          throw new Error('Não foi possível iniciar uma sessão segura sem cadastro.')
        }
      }

      const response = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: reviewName.trim(),
          cidade: reviewCity.trim(),
          relato: reviewText.trim(),
          anonimo: true,
          notas: ratings,
          comportamento: ratings.comportamento,
          seguranca_emocional: ratings.seguranca_emocional,
          respeito: ratings.respeito,
          carater: ratings.carater,
          confianca: ratings.confianca,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Erro ao publicar avaliação.')
      }

      setPublishedProfileId(data?.male_profile_id ?? null)
      setReviewName('')
      setReviewCity('')
      setReviewText('')
      setRatings({
        comportamento: 0,
        seguranca_emocional: 0,
        respeito: 0,
        carater: 0,
        confianca: 0,
      })
    } catch (err: any) {
      alert(err?.message ?? 'Erro ao publicar avaliação.')
    } finally {
      setPublishing(false)
    }
  }

  const goSignup = () => router.push('/signup')

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <section className="rounded-3xl border border-[#D4AF37]/40 bg-[#111111] p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <ShieldCheck className="mt-1 h-7 w-7 text-[#D4AF37]" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#D4AF37]">Entrada sem cadastro</p>
              <h1 className="mt-2 text-3xl font-semibold">Consulte e avalie antes de criar conta</h1>
              <p className="mt-2 text-sm text-white/65">
                Este acesso é uma prévia segura: consultas mostram um resumo limitado e avaliações são publicadas em modo anônimo por uma sessão segura sem cadastro. Para ver detalhes completos e gerenciar seus relatos, crie uma conta verificada.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab('consultar')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'consultar' ? 'bg-[#D4AF37] text-black' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Consultar reputação
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('avaliar')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'avaliar' ? 'bg-[#D4AF37] text-black' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Fazer avaliação
            </button>
          </div>
        </section>

        {activeTab === 'consultar' ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Consulta rápida</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
              />
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
              />
            </div>
            <Button onClick={buscar} disabled={loading} className="mt-4 w-full bg-[#D4AF37] py-6 font-bold text-black hover:bg-[#E0C15A]">
              <Search className="mr-2 h-4 w-4" />
              {loading ? 'Consultando...' : 'Consultar sem cadastro'}
            </Button>

            {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
            {!loading && hasSearched && !error && results.length === 0 && (
              <p className="mt-4 text-center text-sm text-white/45">Nenhum resultado encontrado.</p>
            )}

            <div className="mt-5 space-y-3">
              {results.map((result) => (
                <div key={result.male_profile_id} className="rounded-2xl border border-[#D4AF37]/25 bg-black/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{result.name}</h3>
                      {result.city && <p className="text-sm text-white/50">{result.city}</p>}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${BADGE_STYLES[result.classification]}`}>
                      {BADGE_LABELS[result.classification]}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                    <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-[#D4AF37]" /> Média {result.average_rating.toFixed(1)}</span>
                    <span>{result.total_reviews} avaliação(ões)</span>
                    <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-300" /> {result.alert_count} alerta(s)</span>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
                    <Lock className="mr-2 inline h-4 w-4 text-[#D4AF37]" />
                    Comentários, histórico completo e dados sensíveis exigem cadastro/verificação.
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-xl font-semibold">Avaliação sem cadastro</h2>
            <p className="mb-5 text-sm text-white/60">
              Você pode publicar uma avaliação sem cadastro. Ela entra no mesmo fluxo de publicação das avaliações cadastradas, marcada como anônima, usando uma sessão segura sem e-mail e senha.
            </p>

            <div className="space-y-4">
              <input
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                placeholder="Nome da pessoa avaliada *"
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
              />
              <input
                value={reviewCity}
                onChange={(e) => setReviewCity(e.target.value)}
                placeholder="Cidade"
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
              />

              {ratingFields.map((field) => (
                <div key={field.key} className="rounded-2xl border border-white/10 bg-black/50 p-4">
                  <p className="mb-2 text-sm font-medium text-white/80">{field.label}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${field.label}: ${value} estrela${value > 1 ? 's' : ''}`}
                        onClick={() => setRatings((prev) => ({ ...prev, [field.key]: value }))}
                        className={`text-3xl ${Number(ratings[field.key] ?? 0) >= value ? 'text-[#D4AF37]' : 'text-white/20'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Relato resumido *"
                className="min-h-32 w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
              />
            </div>

            {publishedProfileId && (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                Avaliação publicada com sucesso no fluxo da comunidade.
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button onClick={publishGuestReview} disabled={publishing} className="bg-[#D4AF37] py-6 font-bold text-black hover:bg-[#E0C15A]">
                {publishing ? 'Publicando...' : 'Publicar sem cadastro'}
              </Button>
              <Button onClick={goSignup} variant="outline" className="border-[#D4AF37] py-6 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                Criar conta para gerenciar
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
