import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ShieldAlert, Star } from 'lucide-react'

type MaleProfile = {
  id: string
  display_name: string | null
  city: string | null
}

type Avaliacao = {
  id: string
  male_profile_id: string
  created_at: string
  publica: boolean | null
  is_anonymous: boolean | null

  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null

  relato: string | null

  flags_negative: string[] | null
  flags_positive: string[] | null
}

type Profile = {
  id: string
  plan: string | null
}

const CATEGORIES = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function formatDateBR(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}

function computeAvaliacaoMedia(a: Avaliacao) {
  const vals = [
    a.comportamento,
    a.seguranca_emocional,
    a.respeito,
    a.carater,
    a.confianca,
  ].filter((v): v is number => typeof v === 'number')

  if (vals.length === 0) return null
  const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length
  return avg
}

function reputationLabel(avg: number | null, total: number) {
  // Regras simples e estáveis
  if (!avg || total === 0) return { text: 'Atenção', tone: 'warning' as const }

  // Opcional: se tem poucas avaliações, reduz confiança do rótulo
  if (total < 2 && avg < 3.2) return { text: 'Atenção', tone: 'warning' as const }

  if (avg >= 4.2) return { text: 'Excelente', tone: 'good' as const }
  if (avg >= 3.2) return { text: 'Confiável', tone: 'good' as const }
  if (avg >= 2.2) return { text: 'Atenção', tone: 'warning' as const }
  return { text: 'Perigo', tone: 'danger' as const }
}

function badgeClasses(tone: 'good' | 'warning' | 'danger') {
  if (tone === 'good') return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
  if (tone === 'warning') return 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
  return 'bg-red-500/20 text-red-200 border border-red-500/40'
}

function chipClass(kind: 'neg' | 'pos') {
  if (kind === 'pos') return 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
  return 'bg-red-500/10 text-red-200 border border-red-500/30'
}

function prettyFlag(s: string) {
  // transforma "manipulacao_emocional" -> "Manipulação emocional"
  const normalized = (s || '').replace(/_/g, ' ').trim()
  if (!normalized) return s
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function countFlags(avaliacoes: Avaliacao[], field: 'flags_negative' | 'flags_positive') {
  const map = new Map<string, number>()
  for (const a of avaliacoes) {
    const arr = a[field] ?? []
    for (const f of arr) {
      if (!f) continue
      map.set(f, (map.get(f) ?? 0) + 1)
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  return sorted.map(([flag, count]) => ({ flag, count }))
}

function severityFromCount(n: number) {
  if (n >= 3) return { text: 'crítica', cls: 'bg-red-500 text-white' }
  if (n >= 2) return { text: 'alta', cls: 'bg-red-500/80 text-white' }
  return { text: 'média', cls: 'bg-amber-500/80 text-black' }
}

export default async function PerfilPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })

  // 1) sessão obrigatória
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  // 2) paywall: plano precisa ser pago
  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('id, plan')
    .eq('id', session.user.id)
    .single<Profile>()

  if (meErr || !me) {
    // se der ruim aqui, melhor negar acesso do que vazar
    redirect('/planos')
  }

  const plan = (me.plan ?? 'free').toLowerCase()
  if (plan === 'free') {
    redirect('/planos')
  }

  const maleId = params.id
  if (!maleId) redirect('/consultar-reputacao')

  // 3) carregar perfil do homem
  const { data: perfil } = await supabase
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', maleId)
    .single<MaleProfile>()

  if (!perfil) {
    return <div className="min-h-screen bg-black text-white p-6">Perfil não encontrado</div>
  }

  // 4) carregar avaliações públicas
  const { data: avaliacoesRaw } = await supabase
    .from('avaliacoes')
    .select(
      `
        id,
        male_profile_id,
        created_at,
        publica,
        is_anonymous,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        relato,
        flags_negative,
        flags_positive
      `
    )
    .eq('male_profile_id', maleId)
    .eq('publica', true)
    .order('created_at', { ascending: false })
    .returns<Avaliacao[]>()

  const avaliacoes = avaliacoesRaw ?? []

  // 5) métricas agregadas
  const mediasIndividuais = avaliacoes
    .map((a) => computeAvaliacaoMedia(a))
    .filter((v): v is number => typeof v === 'number')

  const totalAvaliacoes = avaliacoes.length
  const mediaGeral = mediasIndividuais.length
    ? mediasIndividuais.reduce((acc, v) => acc + v, 0) / mediasIndividuais.length
    : null

  // soma total das estrelas (com base na média individual * 1, como no exemplo do Tea)
  // Obs: se você quiser soma “por categorias”, troque para somar os 5 campos.
  const somaTotalEstrelas = mediasIndividuais.reduce((acc, v) => acc + v, 0)

  const label = reputationLabel(mediaGeral, totalAvaliacoes)

  // médias por categoria
  const categoryAverages = CATEGORIES.map((c) => {
    const vals = avaliacoes
      .map((a) => a[c.key] as number | null)
      .filter((v): v is number => typeof v === 'number')
    const avg = vals.length ? vals.reduce((acc, v) => acc + v, 0) / vals.length : 0
    return { ...c, avg }
  })

  // alertas (flags negativas)
  const negativeCounts = countFlags(avaliacoes, 'flags_negative')
  const topNegatives = negativeCounts.slice(0, 6)

  // flags positivas (opcional, mas fica premium)
  const positiveCounts = countFlags(avaliacoes, 'flags_positive')
  const topPositives = positiveCounts.slice(0, 6)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/consultar-reputacao" className="text-sm text-gray-400">
          ← Voltar
        </Link>

        {/* CARD 1: Identidade + status */}
        <div className="mt-4 bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {perfil.display_name ?? 'Sem nome'}
              </h1>
              <p className="text-gray-400 text-sm">{perfil.city ?? 'Cidade não informada'}</p>
            </div>

            <div
              className={
                'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ' +
                badgeClasses(label.tone)
              }
              title="Classificação baseada na média geral das avaliações"
            >
              {label.text}
            </div>
          </div>
        </div>

        {/* CARD 2: média + soma + contagem */}
        <div className="mt-5 bg-gradient-to-b from-[#151515] to-[#0f0f0f] p-6 rounded-2xl border border-[#2a2a2a] text-center">
          <div className="flex justify-center items-center gap-2 text-[#D4AF37]">
            <Star size={30} fill="currentColor" />
            <span className="text-5xl font-bold tabular-nums">
              {mediaGeral ? round1(mediaGeral).toFixed(1) : '0.0'}
            </span>
          </div>

          <p className="text-gray-400 text-sm mt-2">
            Média geral (de 5.0)
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            <div className="bg-black/30 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400">Avaliações</div>
              <div className="text-lg font-semibold tabular-nums">{totalAvaliacoes}</div>
            </div>

            <div className="bg-black/30 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400">Soma total das estrelas</div>
              <div className="text-lg font-semibold tabular-nums">
                {round1(somaTotalEstrelas).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: alertas */}
        <div className="mt-5 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-300 font-semibold">
            <ShieldAlert size={18} />
            Alertas de Segurança
          </div>

          {topNegatives.length === 0 ? (
            <p className="text-gray-400 text-sm mt-3">
              Nenhum alerta de segurança registrado nas avaliações públicas.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {topNegatives.map((item) => {
                const sev = severityFromCount(item.count)
                return (
                  <div
                    key={item.flag}
                    className="flex items-center justify-between gap-3 bg-black/30 border border-gray-800 rounded-xl p-4"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-red-200 truncate">
                        {prettyFlag(item.flag)}
                      </div>
                      <div className="text-xs text-gray-400">
                        citado em {item.count} avaliação(ões)
                      </div>
                    </div>
                    <span className={'px-2 py-1 rounded-full text-xs font-bold ' + sev.cls}>
                      {sev.text}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {topPositives.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-400 mb-2">Pontos positivos mais citados</div>
              <div className="flex flex-wrap gap-2">
                {topPositives.map((p) => (
                  <span
                    key={p.flag}
                    className={'px-3 py-1 rounded-full text-xs border ' + chipClass('pos')}
                    title={`Citado em ${p.count} avaliação(ões)`}
                  >
                    {prettyFlag(p.flag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CARD 4: médias por categoria */}
        <div className="mt-5 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm text-[#D4AF37]">Média por Categoria</div>
            <div className="text-xs text-gray-400">escala 0–5</div>
          </div>

          <div className="mt-4 space-y-4">
            {categoryAverages.map((c) => {
              const pct = clamp((c.avg / 5) * 100, 0, 100)
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-200">{c.label}</span>
                    <span className="text-gray-300 tabular-nums">{round1(c.avg).toFixed(1)}/5</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/40 border border-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D4AF37]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CARD 5: relatos */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-[#D4AF37] mb-3">
            Relatos das Usuárias
          </div>

          {avaliacoes.length === 0 ? (
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 text-gray-400 text-sm">
              Ainda não há relatos públicos para este perfil.
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((a) => {
                const avg = computeAvaliacaoMedia(a)
                const negatives = a.flags_negative ?? []
                const positives = a.flags_positive ?? []
                const hasRelato = (a.relato ?? '').trim().length > 0

                return (
                  <div
                    key={a.id}
                    className="bg-[#111] border border-gray-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[#D4AF37] font-semibold">
                        <Star size={16} fill="currentColor" />
                        <span className="tabular-nums">
                          {avg ? round1(avg).toFixed(1) : '0.0'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400">
                        {formatDateBR(a.created_at)}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-200 leading-relaxed">
                      {hasRelato ? (
                        a.relato
                      ) : (
                        <span className="text-gray-500">
                          (Sem relato textual nesta avaliação)
                        </span>
                      )}
                    </div>

                    {(negatives.length > 0 || positives.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {negatives.map((f) => (
                          <span
                            key={'neg-' + a.id + '-' + f}
                            className={'px-3 py-1 rounded-full text-xs border ' + chipClass('neg')}
                          >
                            {prettyFlag(f)}
                          </span>
                        ))}
                        {positives.map((f) => (
                          <span
                            key={'pos-' + a.id + '-' + f}
                            className={'px-3 py-1 rounded-full text-xs border ' + chipClass('pos')}
                          >
                            {prettyFlag(f)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      {a.is_anonymous ? 'Avaliação anônima' : 'Avaliação identificada'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Link
          href={`/avaliar/${perfil.id}`}
          className="mt-10 block text-center bg-[#D4AF37] text-black font-bold py-3 rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.12)]"
        >
          Avaliar Este Perfil
        </Link>
      </div>
    </div>
  )
}
