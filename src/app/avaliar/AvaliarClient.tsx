'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

type Notas = {
  comportamento: number
  seguranca_emocional: number
  respeito: number
  carater: number
  confianca: number
}

type IdentifierFields = {
  instagram: string
  facebook: string
  tiktok: string
  tinder: string
  linkedin: string
  telegram: string
  whatsapp: string
  telefone: string
  outro: string
}

const IDENTIFIER_LABELS: Array<{ key: keyof IdentifierFields; label: string }> = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'tinder', label: 'Tinder' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'outro', label: 'Outro' },
]

const INITIAL_IDENTIFIERS: IdentifierFields = {
  instagram: '',
  facebook: '',
  tiktok: '',
  tinder: '',
  linkedin: '',
  telegram: '',
  whatsapp: '',
  telefone: '',
  outro: '',
}

const CRITERIOS: Array<{ key: keyof Notas; label: string }> = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
]

const INITIAL_NOTAS: Notas = {
  comportamento: 0,
  seguranca_emocional: 0,
  respeito: 0,
  carater: 0,
  confianca: 0,
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/35 backdrop-blur-md transition focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20'

const sectionClassName =
  'space-y-6 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-lg'

const sectionHeadingClassName =
  'flex items-center gap-3 text-lg font-medium tracking-tight text-white'

const badgeClassName =
  'inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37]/85 text-xs font-semibold text-black'

export default function AvaliarClient() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [identifiers, setIdentifiers] = useState<IdentifierFields>(INITIAL_IDENTIFIERS)
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  const [notas, setNotas] = useState<Notas>(INITIAL_NOTAS)
  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        router.replace('/login?next=/avaliar')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?next=/avaliar')
        return
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [router, supabase])

  const toggleFlag = (slug: string, type: 'green' | 'red') => {
    if (type === 'green') {
      setGreenFlags((prev) =>
        prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]
      )
      return
    }

    setRedFlags((prev) =>
      prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]
    )
  }

  const setNota = (key: keyof Notas, value: number) => {
    setNotas((prev) => ({ ...prev, [key]: value }))
  }

  const setIdentifier = (key: keyof IdentifierFields, value: string) => {
    setIdentifiers((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setNome('')
    setCidade('')
    setIdentifiers(INITIAL_IDENTIFIERS)
    setRelato('')
    setAnonimo(false)
    setNotas(INITIAL_NOTAS)
    setGreenFlags([])
    setRedFlags([])
  }

  const handleSubmit = async () => {
    const hasCidade = Boolean(cidade.trim())
    const hasIdentifier = Object.values(identifiers).some((value) => value.trim().length > 0)

    if (!nome.trim() || (!hasCidade && !hasIdentifier)) {
      alert('Preencha o nome e ao menos um identificador ou a cidade para localizar/criar o perfil.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          cidade,
          identifiers,
          ...identifiers,
          relato,
          anonimo,
          notas,
          comportamento: notas.comportamento,
          seguranca_emocional: notas.seguranca_emocional,
          respeito: notas.respeito,
          carater: notas.carater,
          confianca: notas.confianca,
          is_positive: greenFlags,
          is_negative: redFlags,
          flags_positive: greenFlags,
          flags_negative: redFlags,
          greenFlags,
          redFlags,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('Sessão expirada. Faça login novamente.')
          router.replace('/login?next=/avaliar')
          return
        }

        throw new Error(data?.error || 'Erro ao publicar')
      }

      resetForm()

      if (data?.male_profile_id) {
        router.push(`/consultar-reputacao/${data.male_profile_id}`)
        return
      }

      router.push('/minhas-avaliacoes')
    } catch (error: any) {
      console.error(error)
      alert(error?.message || 'Erro ao publicar avaliação.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-white backdrop-blur-lg">
          <p className="text-sm tracking-wide text-white/80">Carregando avaliação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_30px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-8">
        <header className="space-y-2 pb-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37]/85">Confia+ premium review</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Nova avaliação</h1>
          <p className="text-sm text-white/60">Relate com clareza para fortalecer a segurança da comunidade.</p>
        </header>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>1</span>
            Identificação do homem avaliado
          </h2>
          <div className="grid gap-4">
            <input
              placeholder="Nome *"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClassName}
            />

            <input
              placeholder="Cidade *"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={inputClassName}
            />

            <div className="grid gap-4 md:grid-cols-2">
              {IDENTIFIER_LABELS.map((item) => (
                <label key={item.key} className="grid gap-1.5">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">{item.label}</span>
                  <input
                    placeholder={item.label}
                    value={identifiers[item.key]}
                    onChange={(e) => setIdentifier(item.key, e.target.value)}
                    className={inputClassName}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>2</span>
            Avaliação por estrelas
          </h2>

          <div className="space-y-5">
            {CRITERIOS.map((criterio) => (
              <div
                key={criterio.key}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
              >
                <p className="text-sm font-medium tracking-wide text-white/90">{criterio.label}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${criterio.label}: ${n} estrela${n > 1 ? 's' : ''}`}
                      onClick={() => setNota(criterio.key, n)}
                      className={`rounded-lg px-1 text-3xl leading-none transition duration-200 hover:-translate-y-0.5 hover:scale-110 ${
                        notas[criterio.key] >= n
                          ? 'text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.28)]'
                          : 'text-white/25 hover:text-[#D4AF37]/70'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>3</span>
            Green Flags
          </h2>
          <div className="flex flex-wrap gap-3">
            {GREEN_FLAGS.map((flag) => (
              <button
                key={flag.slug}
                type="button"
                onClick={() => toggleFlag(flag.slug, 'green')}
                className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wider transition duration-200 ${
                  greenFlags.includes(flag.slug)
                    ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-200 shadow-[0_0_15px_rgba(110,231,183,0.15)]'
                    : 'border-white/15 bg-white/[0.03] text-white/70 hover:border-emerald-200/40 hover:bg-emerald-300/10 hover:text-emerald-100'
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>4</span>
            Red Flags
          </h2>
          <div className="flex flex-wrap gap-3">
            {RED_FLAGS.map((flag) => (
              <button
                key={flag.slug}
                type="button"
                onClick={() => toggleFlag(flag.slug, 'red')}
                className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wider transition duration-200 ${
                  redFlags.includes(flag.slug)
                    ? 'border-rose-300/45 bg-rose-300/15 text-rose-200 shadow-[0_0_15px_rgba(251,113,133,0.12)]'
                    : 'border-white/15 bg-white/[0.03] text-white/70 hover:border-rose-200/40 hover:bg-rose-300/10 hover:text-rose-100'
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>5</span>
            Relato
          </h2>
          <textarea
            placeholder="Conte o relato com contexto e fatos importantes"
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            className={`${inputClassName} min-h-36 resize-y`}
          />
        </section>

        <section className={sectionClassName}>
          <h2 className={sectionHeadingClassName}>
            <span className={badgeClassName}>6</span>
            Anonimato
          </h2>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={(e) => setAnonimo(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/30 bg-[#0A0A0A] text-[#D4AF37] focus:ring-[#D4AF37]/40"
            />
            <span>
              Avaliar de forma anônima. Seu vínculo com a conta permanece para segurança da plataforma.
            </span>
          </label>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#B89225] via-[#D4AF37] to-[#E0C15A] text-sm font-semibold uppercase tracking-wider text-black transition duration-300 hover:brightness-105 hover:shadow-[0_0_24px_rgba(212,175,55,0.35)] disabled:opacity-60"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>
    </div>
  )
}
