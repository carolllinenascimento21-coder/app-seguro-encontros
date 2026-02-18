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

      if (response.status === 401 || response.status === 403) {
        alert('Sessão expirada. Faça login novamente.')
        router.replace('/login?next=/avaliar')
        return
      }

      const data = await response.json()

      if (!response.ok) {
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
      <div className="max-w-xl mx-auto p-6 text-white">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white space-y-6">
      <h1 className="text-2xl font-bold">Nova Avaliação</h1>

      <input
        placeholder="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      <input
        placeholder="Cidade"
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      <input
        placeholder="Contato (telefone, instagram, etc)"
        value={contato}
        onChange={(e) => setContato(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      {CRITERIOS.map((criterio) => (
        <div key={criterio.key}>
          <p>{criterio.label}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(criterio.key, n)}
                className={`text-xl ${
                  notas[criterio.key] >= n ? 'text-yellow-400' : 'text-gray-600'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <h2 className="text-green-400 font-semibold">Green Flags</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {GREEN_FLAGS.map((flag) => (
            <button
              key={flag.slug}
              type="button"
              onClick={() => toggleFlag(flag.slug, 'green')}
              className={`px-3 py-1 rounded border ${
                greenFlags.includes(flag.slug) ? 'bg-green-600' : 'bg-zinc-800'
              }`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-red-400 font-semibold">Red Flags</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {RED_FLAGS.map((flag) => (
            <button
              key={flag.slug}
              type="button"
              onClick={() => toggleFlag(flag.slug, 'red')}
              className={`px-3 py-1 rounded border ${
                redFlags.includes(flag.slug) ? 'bg-red-600' : 'bg-zinc-800'
              }`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        placeholder="Relato"
        value={relato}
        onChange={(e) => setRelato(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      <label className="flex gap-2 items-center">
        <input
          type="checkbox"
          checked={anonimo}
          onChange={(e) => setAnonimo(e.target.checked)}
        />
        Avaliar de forma anônima
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-yellow-500 text-black font-bold p-3 rounded"
      >
        {loading ? 'Publicando...' : 'Publicar avaliação'}
      </button>
    </div>
  )
}
