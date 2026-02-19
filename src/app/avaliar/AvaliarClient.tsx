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
  'w-full rounded-2xl border border-white/12 bg-[#121212] px-4 py-3.5 text-sm text-white placeholder:text-white/35 backdrop-blur-md transition focus:border-[#C6A24A]/60 focus:outline-none focus:ring-2 focus:ring-[#C6A24A]/20'

const sectionClassName =
  'space-y-6 rounded-2xl border border-white/12 bg-[#111111] p-6 shadow-[0_16px_34px_rgba(0,0,0,0.35)] md:p-7'

const sectionHeadingClassName =
  'flex items-center gap-3 text-lg font-medium tracking-[0.01em] text-white'

const badgeClassName =
  'inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#C6A24A]/45 bg-[#1A1610] text-[11px] font-semibold text-[#D8BC74] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'

export default function AvaliarClient() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [contato, setContato] = useState('')
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

  const resetForm = () => {
    setNome('')
    setCidade('')
    setContato('')
    setRelato('')
    setAnonimo(false)
    setNotas(INITIAL_NOTAS)
    setGreenFlags([])
    setRedFlags([])
  }

  const handleSubmit = async () => {
    if (!nome.trim() || !cidade.trim()) {
      alert('Nome e cidade são obrigatórios.')
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
          contato,
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
      router.push(`/consultar-reputacao/${data.male_profile_id}`)
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#D0B271]/80">Confia+ premium review</p>
          <h1 className="text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">Nova avaliação</h1>
          <p className="text-sm text-white/65">Relate com clareza para fortalecer a segurança da comunidade.</p>
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

            <input
              placeholder="Contato (telefone, instagram, facebook etc.)"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className={inputClassName}
            />
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
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/78">{criterio.label}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${criterio.label}: ${n} estrela${n > 1 ? 's' : ''}`}
                      onClick={() => setNota(criterio.key, n)}
                      className={`rounded-lg px-1 text-3xl leading-none transition duration-200 hover:-translate-y-0.5 hover:scale-110 ${
                        notas[criterio.key] >= n
                          ? 'text-[#CFAE62] drop-shadow-[0_0_10px_rgba(198,162,74,0.22)]'
                          : 'text-white/25 hover:text-[#CFAE62]/70'
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
          className="h-14 w-full rounded-2xl border border-[#C6A24A]/35 bg-gradient-to-r from-[#9B7A2A] via-[#C6A24A] to-[#B99544] text-sm font-semibold uppercase tracking-[0.16em] text-[#1A1407] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_28px_rgba(198,162,74,0.34)] active:translate-y-0 active:brightness-95 disabled:opacity-60"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>
    </div>
  )
}
