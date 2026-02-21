'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Star } from 'lucide-react'

type MaleProfile = {
  id: string
  nome: string | null
  cidade: string | null
}

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

const GREEN_FLAGS = [
  'comunicacao_clara',
  'escuta_ativa',
  'respeita_limites',
  'controle_emocional',
  'empatia',
  'maturidade_emocional',
  'assume_erros',
  'cumpre_combinados',
  'transparencia',
  'coerencia',
  'nao_faz_jogos',
  'responsavel',
  'respeitoso',
  'confiavel',
  'postura_protetiva_saudavel',
] as const

const RED_FLAGS = [
  'mentiras_constantes',
  'manipulacao_emocional',
  'desrespeito',
  'agressividade',
  'falta_de_respeito',
  'imaturidade_emocional',
  'traicao',
  'golpe_amoroso',
  'stalking',
  'comportamento_abusivo',
  'liso',
] as const

function labelize(flag: string) {
  return flag.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function classNames(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1
        const active = v <= value
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="p-1 rounded-md hover:bg-white/5 transition"
            aria-label={`${v} estrelas`}
          >
            <Star
              className={classNames(
                'h-5 w-5',
                active ? 'text-yellow-400 fill-yellow-400' : 'text-white/25'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

function Chip({
  active,
  children,
  onClick,
  tone,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  tone: 'green' | 'red' | 'neutral'
}) {
  const toneClasses =
    tone === 'green'
      ? active
        ? 'border-green-500/60 bg-green-500/15 text-green-200'
        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/7'
      : tone === 'red'
        ? active
          ? 'border-red-500/60 bg-red-500/15 text-red-200'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/7'
        : active
          ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-100'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/7'

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'px-3 py-1.5 rounded-full border text-xs tracking-wide transition',
        toneClasses
      )}
    >
      {children}
    </button>
  )
}

async function insertAvaliacaoRobusto(
  supabase: any,
  payloadBase: Record<string, any>
) {
  // Seu schema aparece com variações de coluna (prints mostram inconsistência)
  // Tentamos, em ordem, os nomes mais prováveis.
  const attempts: Array<Record<string, any>> = [
    payloadBase, // com is_anonymous (se vier)
    { ...payloadBase, anonima: payloadBase.is_anonymous, is_anonymous: undefined },
    { ...payloadBase, anonimo: payloadBase.is_anonymous, is_anonymous: undefined },
  ].map((p) => {
    const cleaned: Record<string, any> = {}
    for (const k of Object.keys(p)) {
      if (p[k] !== undefined) cleaned[k] = p[k]
    }
    return cleaned
  })

  let lastError: any = null

  for (const payload of attempts) {
    const { error } = await supabase.from('avaliacoes').insert(payload)
    if (!error) return { ok: true as const }
    lastError = error
    const msg = String(error.message || '').toLowerCase()
    // Se for erro de "coluna não existe", tenta o próximo
    if (msg.includes('column') && msg.includes('does not exist')) continue
    if (msg.includes('could not find') && msg.includes('column')) continue
    // outro tipo de erro: para e retorna
    return { ok: false as const, error }
  }

  return { ok: false as const, error: lastError }
}

export default function AvaliarPerfilPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [profile, setProfile] = useState<MaleProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [anonimo, setAnonimo] = useState(true)
  const [relato, setRelato] = useState('')
  const [greens, setGreens] = useState<string[]>([])
  const [reds, setReds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [notas, setNotas] = useState<Record<CriterioKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingProfile(true)
      const { data, error } = await supabase
        .from('male_profiles')
        .select('id,nome,cidade')
        .eq('id', params.id)
        .single()

      if (!alive) return

      if (error) {
        console.error(error)
        setProfile(null)
      } else {
        setProfile(data as MaleProfile)
      }
      setLoadingProfile(false)
    })()
    return () => {
      alive = false
    }
  }, [params.id, supabase])

  const totalEstrelas = useMemo(() => {
    return CRITERIOS.reduce((acc, c) => acc + (notas[c.key] || 0), 0)
  }, [notas])

  const mediaGeral = useMemo(() => {
    const n = CRITERIOS.length
    return n ? totalEstrelas / n : 0
  }, [totalEstrelas])

  const toggle = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const validate = () => {
    // Exige pelo menos 1 estrela em alguma categoria e relato mínimo (igual “padrão premium”)
    const hasAnyRating = Object.values(notas).some((v) => v > 0)
    if (!hasAnyRating) return 'Selecione ao menos 1 estrela em alguma categoria.'
    if (relato.trim().length < 10) return 'Escreva um relato com pelo menos 10 caracteres.'
    return null
  }

  const onSubmit = async () => {
    const v = validate()
    if (v) {
      alert(v)
      return
    }

    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      alert('Você precisa estar logada para avaliar.')
      setSubmitting(false)
      return
    }

    const payloadBase = {
      male_profile_id: params.id,
      user_id: session.user.id,
      publica: true, // seus prints mostram "publica"
      is_anonymous: anonimo, // tenta esse, e fallback para anonima/anonimo
      comportamento: notas.comportamento,
      seguranca_emocional: notas.seguranca_emocional,
      respeito: notas.respeito,
      carater: notas.carater,
      confianca: notas.confianca,
      flags_positive: greens,
      flags_negative: reds,
      relato: relato.trim(),
    }

    const res = await insertAvaliacaoRobusto(supabase, payloadBase)

    if (!res.ok) {
      console.error(res.error)
      alert(`Erro ao publicar avaliação: ${res.error?.message || 'desconhecido'}`)
      setSubmitting(false)
      return
    }

    // Redireciona para a reputação (que já soma e mostra tudo)
    router.push(`/consultar-reputacao/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Premium backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute top-64 left-1/3 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[520px] px-5 pb-10 pt-10">
        <div className="mb-6">
          <div className="text-[11px] tracking-[0.22em] text-yellow-400/80">
            CONFIA+ PREMIUM REVIEW
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Avaliar Perfil</h1>
          <p className="mt-2 text-white/60 text-sm">
            Avalie com clareza. Seu relato fortalece a segurança da comunidade.
          </p>
        </div>

        {/* Card 0: Identificação do perfil */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-white/50">Perfil avaliado</div>

              {loadingProfile ? (
                <div className="mt-2 h-5 w-44 rounded bg-white/10 animate-pulse" />
              ) : (
                <div className="mt-1 text-lg font-semibold">
                  {profile?.nome || 'Nome não informado'}
                </div>
              )}

              {loadingProfile ? (
                <div className="mt-2 h-4 w-28 rounded bg-white/10 animate-pulse" />
              ) : (
                <div className="mt-1 text-sm text-white/60">
                  {profile?.cidade || 'Cidade não informada'}
                </div>
              )}
            </div>

            <div className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-100">
              ID verificado
            </div>
          </div>
        </div>

        {/* Card 1: Estrelas por categoria */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Avaliação por estrelas</div>
              <div className="text-xs text-white/50 mt-1">
                Soma: <span className="text-yellow-300">{totalEstrelas}</span> · Média:{' '}
                <span className="text-yellow-300">{mediaGeral.toFixed(1)}</span>/5
              </div>
            </div>
            <div className="text-xs text-white/45">0–5</div>
          </div>

          <div className="mt-4 space-y-4">
            {CRITERIOS.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div className="text-sm text-white/85">{c.label}</div>
                <StarRating
                  value={notas[c.key]}
                  onChange={(v) => setNotas((prev) => ({ ...prev, [c.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Green flags */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/90">Green Flags</div>
            <div className="text-xs text-white/50">{greens.length} selecionadas</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {GREEN_FLAGS.map((f) => (
              <Chip
                key={f}
                tone="green"
                active={greens.includes(f)}
                onClick={() => toggle(f, greens, setGreens)}
              >
                {labelize(f)}
              </Chip>
            ))}
          </div>
        </div>

        {/* Card 3: Red flags */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/90">Red Flags</div>
            <div className="text-xs text-white/50">{reds.length} selecionadas</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {RED_FLAGS.map((f) => (
              <Chip
                key={f}
                tone="red"
                active={reds.includes(f)}
                onClick={() => toggle(f, reds, setReds)}
              >
                {labelize(f)}
              </Chip>
            ))}
          </div>
        </div>

        {/* Card 4: Relato */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Relato</div>
            <div className="text-xs text-white/50">{relato.trim().length}/500</div>
          </div>

          <textarea
            value={relato}
            onChange={(e) => setRelato(e.target.value.slice(0, 500))}
            placeholder="Conte o relato com contexto e fatos importantes."
            className="mt-4 w-full min-h-[120px] resize-none rounded-xl border border-white/10 bg-black/50 p-4 text-sm outline-none placeholder:text-white/30 focus:border-yellow-500/40"
          />
          <div className="mt-2 text-[12px] text-white/45">
            Evite expor dados sensíveis. Seja objetiva e factual.
          </div>
        </div>

        {/* Card 5: Anonimato */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Anonimato</div>
              <div className="mt-1 text-xs text-white/50">
                Seu vínculo com a conta permanece para segurança da plataforma.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAnonimo((v) => !v)}
              className={classNames(
                'h-9 w-16 rounded-full border transition relative',
                anonimo
                  ? 'border-yellow-500/50 bg-yellow-500/15'
                  : 'border-white/15 bg-white/5'
              )}
              aria-label="Alternar anonimato"
            >
              <span
                className={classNames(
                  'absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full transition',
                  anonimo ? 'left-8 bg-yellow-400' : 'left-1 bg-white/40'
                )}
              />
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={classNames(
            'mt-7 w-full rounded-2xl py-4 font-semibold text-black transition',
            submitting ? 'bg-yellow-500/60' : 'bg-yellow-500 hover:bg-yellow-400'
          )}
        >
          {submitting ? 'Publicando...' : 'PUBLICAR AVALIAÇÃO'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-white/75 hover:bg-white/7 transition"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
