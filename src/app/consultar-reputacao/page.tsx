'use client'

import { trackEvent } from '@/lib/track'
import { useState } from 'react'
import {
  Search,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Crown,
} from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { useRouter } from 'next/navigation'

interface PerfilResultado {
  id: string
  display_name: string
  city: string | null
  total_avaliacoes: number
  media_geral: number
  confiabilidade_percentual: number
  flags_positive: string[] | null
  flags_negative: string[] | null
}

export default function ConsultarReputacao() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [results, setResults] = useState<PerfilResultado[]>([])
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const media = (p: PerfilResultado) => {
    if (typeof p.media_geral !== 'number') return '—'
    return p.media_geral.toFixed(1)
  }

  const buscar = async () => {
    const normalizedNome = nome.trim().toLowerCase()
    const normalizedCidade = cidade.trim().toLowerCase()

    if (!normalizedNome && !normalizedCidade) {
      alert('Digite um nome e/ou cidade para buscar.')
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (normalizedNome) params.set('nome', normalizedNome)
      if (normalizedCidade) params.set('cidade', normalizedCidade)

      const res = await fetch(`/api/busca?${params.toString()}`)
      const payload = await res.json()

      if (!res.ok) {
        alert(payload?.error ?? 'Erro ao buscar reputação.')
        return
      }

      setResults(payload.results ?? [])
    } catch {
      alert('Erro ao buscar reputação.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (id: string) => {
    if (blocked) {
      router.push('/planos')
      return
    }

    router.push(`/consultar-reputacao/${id}`)
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">
          Consultar Reputação
        </h1>

        <p className="text-gray-400 text-sm mb-6">
          Uma consulta gratuita disponível. Detalhes completos exigem plano.
        </p>

        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800 mb-6">
          <div className="space-y-3 mb-4">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
            />

            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <button
            onClick={buscar}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg flex justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </div>

        <div className="space-y-4">
          {results.map((r) => (
            <div
              key={r.id}
              className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-[#D4AF37] transition"
              onClick={() => handleOpen(r.id)}
            >
              <div className="flex justify-between mb-2">
                <div>
                  <h3 className="text-white font-bold">
                    {r.display_name}
                  </h3>

                  {r.city && (
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {r.city}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[#D4AF37]">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-bold">{media(r)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {r.total_avaliacoes} avaliações • {r.confiabilidade_percentual}% confiável
              </div>

              {r.flags_negative?.length ? (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  Possui alertas
                </div>
              ) : r.flags_positive?.length ? (
                <div className="flex items-center gap-2 text-green-400 text-xs mt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Pontos positivos destacados
                </div>
              ) : null}
            </div>
          ))}

          {!loading && results.length === 0 && (
            <p className="text-gray-500 text-center text-sm">
              Nenhum resultado encontrado.
            </p>
          )}
        </div>
      </div>

      <Navbar />
    </div>
  )
}
