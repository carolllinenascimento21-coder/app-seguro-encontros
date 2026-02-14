'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import Navbar from '@/components/custom/navbar'

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

  const [flagsPositive, setFlagsPositive] = useState<string[]>([])
  const [flagsNegative, setFlagsNegative] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStarClick = (criterio: CriterioKey, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [criterio]: value,
    }))
  }

  const validarNotas = () => {
    return Object.values(ratings).every((n) => n >= 1 && n <= 5)
  }

  const publicar = async () => {
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
          ...ratings,
          flags_positive: flagsPositive,
          flags_negative: flagsNegative,
          relato,
          anonimo,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.message ?? 'Erro ao publicar avaliação')
      }

      // Após publicar, volta para perfil
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

        <h1 className="text-2xl font-bold text-white mb-6">
          Avaliar Perfil
        </h1>

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

        {/* Relato */}
        <div className="mb-6">
          <textarea
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            placeholder="Relate sua experiência (opcional)"
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-3 text-white"
          />
        </div>

        {/* Anônimo */}
        <div className="mb-6 flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => setAnonimo(e.target.checked)}
          />
          Avaliar de forma anônima
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={publicar}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </div>

      <Navbar />
    </div>
  )
}
