'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Star, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { useAccessControl } from '@/hooks/use-access-control'

interface PerfilResultado {
  male_profile_id: string
  name: string
  city: string | null
  average_rating: number
  total_reviews: number
  positive_percentage: number
  alert_count: number
  classification: 'perigo' | 'atencao' | 'confiavel' | 'excelente'
}

const BADGE_STYLES: Record<PerfilResultado['classification'], string> = {
  perigo: 'text-red-500 bg-red-500/10 border-red-500/30',
  atencao: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  confiavel: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  excelente: 'text-green-500 bg-green-500/10 border-green-500/30',
}

const BADGE_LABELS: Record<PerfilResultado['classification'], string> = {
  perigo: 'Perigo',
  atencao: 'Atenção',
  confiavel: 'Confiável',
  excelente: 'Excelente',
}

export default function ConsultarReputacao() {
  const router = useRouter()
  const { checkAccess } = useAccessControl()

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [results, setResults] = useState<PerfilResultado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = async () => {
    const nomeBusca = nome.trim()
    const cidadeBusca = cidade.trim()

    if (!nomeBusca && !cidadeBusca) {
      alert('Digite nome ou cidade')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResults([])

      const params = new URLSearchParams()

      if (nomeBusca) params.set('nome', nomeBusca)
      if (cidadeBusca) params.set('cidade', cidadeBusca)

      const res = await fetch(`/api/reputation/search?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      // 🔐 não logada
      if (res.status === 401) {
        router.push('/login')
        return
      }

      // 💰 paywall
      if (res.status === 403) {
        router.push('/planos')
        return
      }

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data?.message ?? 'Erro na busca')
      }

      setResults(data.results ?? [])
    } catch (err: any) {
      console.error('Erro na busca:', err)
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleResultClick = async (maleProfileId: string) => {
    const access = await checkAccess({ redirectOnBlock: true })

    if (!access.allowed) return

    router.push(`/consultar-reputacao/${maleProfileId}`)
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold text-white mb-6">
          Consultar Reputação
        </h1>

        <div className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-5 mb-6">

          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
          />

          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Cidade"
            className="w-full mb-4 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
          />

          <button
            onClick={buscar}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg flex justify-center gap-2 hover:opacity-90 transition"
          >
            <Search size={18} />
            {loading ? 'Buscando...' : 'Consultar'}
          </button>

        </div>

        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {!loading && results.length === 0 && !error && (
            <p className="text-gray-500 text-center text-sm">
              Nenhum resultado encontrado
            </p>
          )}

          {results.map((r) => (
            <div
              key={r.male_profile_id}
              onClick={() => handleResultClick(r.male_profile_id)}
              className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer"
            >

              <div className="flex items-start justify-between mb-3">

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {r.name}
                  </h3>

                  {r.city && (
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {r.city}
                    </p>
                  )}
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${BADGE_STYLES[r.classification]}`}
                >
                  {BADGE_LABELS[r.classification]}
                </div>

              </div>

              <div className="flex items-center gap-4 mb-3">

                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                  <span className="text-sm font-semibold text-white">
                    {r.average_rating.toFixed(1)}
                  </span>
                </div>

                <div className="text-sm text-gray-400">
                  {r.total_reviews} avaliações
                </div>

                <div className="text-sm text-gray-400">
                  {r.positive_percentage}% confiável
                </div>

              </div>

              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 w-fit">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-400">
                  {r.alert_count} alerta(s) ativo(s)
                </span>
              </div>

            </div>
          ))}

        </div>
      </div>

      <Navbar />
    </div>
  )
}
