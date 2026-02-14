'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'
import { Star } from 'lucide-react'

export default function AvaliarPerfilPage() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [anonimo, setAnonimo] = useState(false)
  const [relato, setRelato] = useState('')

  const [ratings, setRatings] = useState({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])

  function toggleGreenFlag(flag: string) {
    setGreenFlags((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    )
  }

  function toggleRedFlag(flag: string) {
    setRedFlags((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    )
  }

  function setRating(key: keyof typeof ratings, value: number) {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function publicar() {
    if (!id) return

    if (Object.values(ratings).some((r) => r < 1)) {
      alert('Avalie todos os critérios')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male_profile_id: id,
          ratings,
          greenFlags,
          redFlags,
          relato,
          anonimo,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message ?? 'Erro ao publicar')
      }

      router.push(`/consultar-reputacao/${id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const criterios = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'seguranca_emocional', label: 'Segurança Emocional' },
    { key: 'respeito', label: 'Respeito' },
    { key: 'carater', label: 'Caráter' },
    { key: 'confianca', label: 'Confiança' },
  ] as const

  return (
    <div className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto text-white">

      <h1 className="text-2xl font-bold mb-6">
        Avaliar Perfil
      </h1>

      {/* CRITÉRIOS */}
      {criterios.map((c) => (
        <div key={c.key} className="mb-4">
          <p className="mb-2 text-sm text-gray-400">{c.label}</p>

          <div className="flex gap-2">
            {[1,2,3,4,5].map((star) => (
              <Star
                key={star}
                size={24}
                onClick={() => setRating(c.key, star)}
                className="cursor-pointer"
                fill={ratings[c.key] >= star ? '#D4AF37' : 'none'}
                color="#D4AF37"
              />
            ))}
          </div>
        </div>
      ))}

      {/* GREEN FLAGS */}
      <div className="mt-6">
        <h3 className="text-green-400 font-bold mb-2">Green Flags</h3>

        <div className="flex flex-wrap gap-2">
          {GREEN_FLAGS.map((flag) => (
            <button
              key={flag}
              type="button"
              onClick={() => toggleGreenFlag(flag)}
              className={`px-3 py-1 text-xs rounded-lg border ${
                greenFlags.includes(flag)
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-black border-gray-700 text-gray-400'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* RED FLAGS */}
      <div className="mt-6">
        <h3 className="text-red-400 font-bold mb-2">Red Flags</h3>

        <div className="flex flex-wrap gap-2">
          {RED_FLAGS.map((flag) => (
            <button
              key={flag}
              type="button"
              onClick={() => toggleRedFlag(flag)}
              className={`px-3 py-1 text-xs rounded-lg border ${
                redFlags.includes(flag)
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-black border-gray-700 text-gray-400'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* RELATO */}
      <textarea
        value={relato}
        onChange={(e) => setRelato(e.target.value)}
        placeholder="Relato"
        className="w-full mt-6 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
      />

      <div className="flex items-center gap-2 mt-4 text-sm">
        <input
          type="checkbox"
          checked={anonimo}
          onChange={() => setAnonimo(!anonimo)}
        />
        Avaliar de forma anônima
      </div>

      <button
        onClick={publicar}
        disabled={loading}
        className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg mt-6"
      >
        {loading ? 'Publicando...' : 'Publicar avaliação'}
      </button>
    </div>
  )
}
