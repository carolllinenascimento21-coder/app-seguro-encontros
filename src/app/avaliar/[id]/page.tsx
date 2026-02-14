'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

export default function AvaliarPerfilExistente() {
  const params = useParams()
  const router = useRouter()

  const maleProfileId = params?.id as string

  const [ratings, setRatings] = useState<Record<CriterioKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFlag = (
    value: string,
    list: string[],
    setter: (v: string[]) => void
  ) => {
    if (list.includes(value)) {
      setter(list.filter((x) => x !== value))
    } else {
      setter([...list, value])
    }
  }

  const handleStarClick = (criterio: CriterioKey, value: number) => {
    setRatings((prev) => ({ ...prev, [criterio]: value }))
  }

  const validarNotas = () => Object.values(ratings).every((n) => n >= 1 && n <= 5)

  const publicar = async () => {
    if (!maleProfileId) {
      alert('Perfil inválido.')
      return
    }

    if (!validarNotas()) {
      alert('Avalie todos os critérios de 1 a 5 estrelas.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/avaliacoes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male_profile_id: maleProfileId,
          ratings,
          greenFlags,
          redFlags,
          relato,
          anonimo,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.message ?? 'Erro ao publicar avaliação')
      }

      router.push(`/consultar-reputacao/${maleProfileId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-md mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-white mb-6">Avaliar Perfil</h1>

        {/* CRITÉRIOS */}
        {CRITERIOS.map((c) => (
          <div key={c.key} className="mb-6">
            <p className="text-white mb-2">{c.label}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={28}
                  onClick={() => handleStarClick(c.key, star)}
                  className={`cursor-pointer transition ${
                    ratings[c.key] >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* GREEN FLAGS */}
        <div className="mt-6">
          <p className="text-green-400 font-semibold mb-2">Green Flags</p>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map((f) => {
              const active = greenFlags.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(f, greenFlags, setGreenFlags)}
                  className={`px-3 py-1 rounded-lg text-xs border transition ${
                    active
                      ? 'bg-green-500/20 border-green-500 text-green-300'
                      : 'bg-[#1A1A1A] border-gray-800 text-gray-200 hover:border-green-500/40'
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        {/* RED FLAGS */}
        <div className="mt-6">
          <p className="text-red-400 font-semibold mb-2">Red Flags</p>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((f) => {
              const active = redFlags.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(f, redFlags, setRedFlags)}
                  className={`px-3 py-1 rounded-lg text-xs border transition ${
                    active
                      ? 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-[#1A1A1A] border-gray-800 text-gray-200 hover:border-red-500/40'
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        {/* RELATO */}
        <div className="mt-6">
          <textarea
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            placeholder="Relato (opcional)"
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-3 text-white min-h-[120px]"
          />
        </div>

        {/* ANÔNIMO */}
        <div className="mt-4 flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => setAnonimo(e.target.checked)}
          />
          Avaliar de forma anônima
        </div>

        {error && (
          <div className="text-red-400 text-sm mt-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={publicar}
          disabled={loading}
          className="w-full mt-6 bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>

      <Navbar />
    </div>
  )
}
