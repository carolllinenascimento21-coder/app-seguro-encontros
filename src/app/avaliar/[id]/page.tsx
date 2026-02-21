'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, Check } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Se você já tem essas listas em /lib/flags, pode importar.
// Se não tiver, pode manter aqui mesmo.
// import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

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

type MaleProfile = {
  id: string
  display_name: string | null
  city: string | null
}

type Notas = {
  comportamento: number
  seguranca_emocional: number
  respeito: number
  carater: number
  confianca: number
}

const LABELS: Record<keyof Notas, string> = {
  comportamento: 'Comportamento',
  seguranca_emocional: 'Segurança Emocional',
  respeito: 'Respeito',
  carater: 'Caráter',
  confianca: 'Confiança',
}

function humanizeFlag(flag: string) {
  return flag
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function clampStar(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(5, Math.max(0, Math.round(n)))
}

export default function AvaliarPerfilPage() {
  const supabase = createClientComponentClient()
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const maleProfileId = params?.id

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<MaleProfile | null>(null)

  const [notas, setNotas] = useState<Notas>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [flagsPositive, setFlagsPositive] = useState<string[]>([])
  const [flagsNegative, setFlagsNegative] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!maleProfileId) return
      setLoading(true)

      const { data, error } = await supabase
        .from('male_profiles')
        .select('id, display_name, city')
        .eq('id', maleProfileId)
        .single()

      if (error) {
        console.error('Erro ao buscar male_profile:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    run()
  }, [maleProfileId, supabase])

  const somaEstrelas = useMemo(() => {
    return Object.values(notas).reduce((acc, v) => acc + clampStar(v), 0)
  }, [notas])

  const mediaGeral = useMemo(() => {
    const values = Object.values(notas).map(clampStar)
    const total = values.reduce((acc, v) => acc + v, 0)
    return values.length ? total / values.length : 0
  }, [notas])

  function toggleFlag(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  // Inserção “à prova de schema” (porque seus prints mostram nomes diferentes para o campo de anonimato)
  async function insertAvaliacaoRobusta(base: Record<string, any>) {
    // Tentativas do campo boolean de anonimato (na ordem)
    const anonymousKeys = ['anonimo', 'anonima', 'is_anonymous']

    // Monta variações do payload: com anonimo / anonima / is_anonymous / sem campo nenhum
    const payloads: Record<string, any>[] = []

    for (const k of anonymousKeys) {
      payloads.push({ ...base, [k]: anonimo })
    }
    payloads.push({ ...base }) // fallback final

    // Tenta inserir até uma dar certo
    for (const p of payloads) {
      const { error } = await supabase.from('avaliacoes').insert(p)
      if (!error) return null

      // Se erro for “coluna não existe”, tenta próxima variação
      const msg = (error as any)?.message || ''
      const code = (error as any)?.code || ''
      const isMissingColumn =
        code === 'PGRST204' ||
        /could not find the .* column/i.test(msg) ||
        /column .* does not exist/i.test(msg)

      console.error('Erro insert (tentativa):', error)

      if (!isMissingColumn) {
        // Outro tipo de erro: para aqui
        return error
      }
    }

    return { message: 'Falha ao inserir: nenhuma variação de schema funcionou.' }
  }

  const publicar = async () => {
    if (!profile?.id) {
      alert('Perfil não encontrado.')
      return
    }

    // Validação mínima (evita “avaliar tudo 0” por acidente)
    const filled = Object.values(notas).some((v) => clampStar(v) > 0)
    if (!filled) {
      alert('Selecione ao menos 1 estrela em alguma categoria.')
      return
    }

    const payloadBase = {
      male_profile_id: profile.id,
      comportamento: clampStar(notas.comportamento),
      seguranca_emocional: clampStar(notas.seguranca_emocional),
      respeito: clampStar(notas.respeito),
      carater: clampStar(notas.carater),
      confianca: clampStar(notas.confianca),
      // Campos que EXISTEM no seu print:
      flags_positive: flagsPositive,
      flags_negative: flagsNegative,
      relato: relato?.trim() ? relato.trim() : null,
      // Não envio green_flags/red_flags porque NÃO EXISTEM
      // Não envio media_geral porque não vimos esse campo no seu schema
    }

    const err = await insertAvaliacaoRobusta(payloadBase)

    if (err) {
      alert(`Erro ao publicar avaliação: ${(err as any)?.message ?? 'desconhecido'}`)
      return
    }

    router.push(`/consultar-reputacao/${profile.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Perfil não encontrado
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="mb-6">
          <div className="text-xs tracking-[0.2em] text-[#D4AF37]/80 uppercase">
            Confia+ Premium Review
          </div>
          <h1 className="text-3xl font-semibold mt-2 text-white">
            Avaliar Perfil
          </h1>
          <p className="text-white/60 mt-2">
            Avalie com responsabilidade.
          </p>
        </div>

        {/* Card: perfil avaliado */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="text-sm text-white/55">Perfil avaliado</div>
          <div className="mt-1 text-lg font-semibold">
            {profile.display_name || 'Nome não informado'}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {profile.city || 'Cidade não informada'}
          </div>
        </div>

        {/* Card: estrelas + soma + média */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Avaliação por estrelas</div>
            <div className="text-xs text-white/60">
              Soma: <span className="text-[#D4AF37] font-semibold">{somaEstrelas}</span> · Média:{' '}
              <span className="text-[#D4AF37] font-semibold">{mediaGeral.toFixed(1)}</span>/5
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {(Object.keys(notas) as (keyof Notas)[]).map((key) => (
              <div
                key={key}
                className="bg-[#101010] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="text-sm text-white/85">{LABELS[key]}</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNotas((prev) => ({ ...prev, [key]: n }))}
                      className="p-0.5"
                      aria-label={`${LABELS[key]}: ${n} estrelas`}
                    >
                      <Star
                        size={18}
                        className={
                          n <= clampStar(notas[key])
                            ? 'text-[#D4AF37] fill-[#D4AF37]'
                            : 'text-white/25'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Green Flags */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Green Flags</div>
            <div className="text-xs text-white/60">{flagsPositive.length} selecionadas</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {GREEN_FLAGS.map((f) => {
              const selected = flagsPositive.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(flagsPositive, setFlagsPositive, f)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs border transition',
                    selected
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]'
                      : 'bg-transparent border-white/10 text-white/70 hover:border-white/20',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-1">
                    {selected ? <Check size={14} /> : null}
                    {humanizeFlag(f)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Card: Red Flags */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Red Flags</div>
            <div className="text-xs text-white/60">{flagsNegative.length} selecionadas</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {RED_FLAGS.map((f) => {
              const selected = flagsNegative.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(flagsNegative, setFlagsNegative, f)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs border transition',
                    selected
                      ? 'bg-red-500/10 border-red-500/35 text-red-300'
                      : 'bg-transparent border-white/10 text-white/70 hover:border-white/20',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-1">
                    {selected ? <Check size={14} /> : null}
                    {humanizeFlag(f)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Card: Relato */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-5">
          <div className="font-semibold">Relato</div>
          <p className="text-xs text-white/55 mt-1">
            Conte com contexto e fatos importantes (evite dados sensíveis).
          </p>

          <textarea
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            placeholder="Conte o relato com contexto e fatos importantes"
            className="mt-3 w-full bg-[#101010] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/20 min-h-[120px]"
          />
        </div>

        {/* Card: Anônimo */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-white/10 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={() => setAnonimo((v) => !v)}
              className="mt-1"
            />
            <div>
              <div className="font-semibold text-sm">Avaliar de forma anônima</div>
              <div className="text-xs text-white/55 mt-1">
                Seu vínculo pode ser mantido apenas para segurança da plataforma.
              </div>
            </div>
          </label>
        </div>

        <button
          onClick={publicar}
          className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:opacity-95 transition"
        >
          Publicar Avaliação
        </button>
      </div>
    </div>
  )
}
