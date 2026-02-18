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
  'w-full rounded-xl border border-[#D4AF37] bg-[#111111] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50'

const sectionClassName = 'space-y-4 rounded-2xl border border-[#D4AF37]/60 bg-[#0A0A0A] p-5'

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
          alert('Sua sessão precisa ser revalidada. Faça login novamente para continuar.')
          router.replace('/login?next=/avaliar')
          return
        }

        throw new Error(data?.error || 'Erro ao publicar')
      }

      resetForm()
      alert('Avaliação publicada!')
    } catch (error: any) {
      console.error(error)
      alert(error?.message || 'Erro ao publicar avaliação.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="w-full max-w-3xl rounded-2xl border border-[#D4AF37] bg-[#0A0A0A] p-8 text-white">
          <p>Carregando avaliação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-[#D4AF37] bg-[#050505] p-6 text-white md:p-8">
        <h1 className="text-center text-3xl font-bold text-[#D4AF37]">Nova avaliação</h1>

        <section className={sectionClassName}>
          <h2 className="text-lg font-semibold text-[#EFD9A7]">1. Identificação do homem avaliado</h2>
          <div className="grid gap-3">
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
          <h2 className="text-lg font-semibold text-[#EFD9A7]">2. Avaliação por estrelas</h2>
          <div className="space-y-4">
            {CRITERIOS.map((criterio) => (
              <div key={criterio.key} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="font-medium">{criterio.label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${criterio.label}: ${n} estrela${n > 1 ? 's' : ''}`}
                      onClick={() => setNota(criterio.key, n)}
                      className={`rounded-md px-1 text-2xl transition ${
                        notas[criterio.key] >= n ? 'text-[#D4AF37]' : 'text-zinc-600 hover:text-[#D4AF37]/70'
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
          <h2 className="text-lg font-semibold text-green-400">3. Green Flags</h2>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map((flag) => (
              <button
                key={flag.slug}
                type="button"
                onClick={() => toggleFlag(flag.slug, 'green')}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  greenFlags.includes(flag.slug)
                    ? 'border-green-500 bg-green-600/30 text-green-200'
                    : 'border-green-800 bg-transparent text-green-400 hover:border-green-500'
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-lg font-semibold text-red-400">4. Red Flags</h2>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((flag) => (
              <button
                key={flag.slug}
                type="button"
                onClick={() => toggleFlag(flag.slug, 'red')}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  redFlags.includes(flag.slug)
                    ? 'border-red-500 bg-red-600/30 text-red-200'
                    : 'border-red-900 bg-transparent text-red-400 hover:border-red-500'
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-lg font-semibold text-[#EFD9A7]">5. Relato</h2>
          <textarea
            placeholder="Conte o relato com contexto e fatos importantes"
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            className={`${inputClassName} min-h-28 resize-y`}
          />
        </section>

        <section className={sectionClassName}>
          <h2 className="text-lg font-semibold text-[#EFD9A7]">6. Anonimato</h2>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={(e) => setAnonimo(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#D4AF37] bg-[#111111] text-[#D4AF37]"
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
          className="w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-black transition hover:bg-[#c7a233] disabled:opacity-60"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>
    </div>
  )
}
