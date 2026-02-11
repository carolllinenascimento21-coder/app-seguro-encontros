'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Star,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import Navbar from '@/components/custom/navbar'

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
  const [error, setError] = useState<string | null>(null)

  /* ---------- MÉDIA FORMATADA ---------- */
  const mediaFormatada = (p: PerfilResultado) => {
    if (typeof p.media_geral !== 'number' || p.total_avaliacoes === 0)
      return '—'
    return p.media_geral.toFixed(1)
  }

  /* ---------- SCORE COMPOSTO ENTERPRISE ---------- */
  const getScore = (p: PerfilResultado) => {
    const media = p.media_geral ?? 0
    const total = p.total_avaliacoes ?? 0

    if (!total || !media) return 0

    return Number((media * Math.log(total + 1)).toFixed(4))
  }

  /* ---------- BADGE AUTOMÁTICO ---------- */
  const getBadge = (p: PerfilResultado) => {
    const media = p.media_geral ?? 0
    const conf = p.confiabilidade_percentual ?? 0
    const total = p.total_avaliacoes ?? 0

    if (media >= 4.2 && conf >= 85 && total >= 5)
      return {
        label: 'Excelente',
        color: 'bg-green-600',
        icon: <ShieldCheck size={14} />,
      }

    if (media >= 3.2 && conf >= 60)
      return {
        label: 'Confiável',
        color: 'bg-blue-600',
        icon: <ShieldCheck size={14} />,
      }

    return {
      label: 'Perigo',
      color: 'bg-red-600',
      icon: <ShieldAlert size={14} />,
    }
  }

  /* ---------- BUSCA ---------- */
  const buscar = async () => {
    const nomeNormalizado = nome.trim().toLowerCase()
    const cidadeNormalizada = cidade.trim().toLowerCase()

    if (!nomeNormalizado && !cidadeNormalizada) {
      alert('Digite nome ou cidade')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (nomeNormalizado) params.set('nome', nomeNormalizado)
      if (cidadeNormalizada) params.set('cidade', cidadeNormalizada)

      const res = await fetch(`/api/busca?${params.toString()}`)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? 'Erro na busca')
      }

      const lista: PerfilResultado[] = data.results ?? []

      // 🔥 Ordenação enterprise
      const ordenado = [...lista].sort(
        (a, b) => getScore(b) - getScore(a)
      )

      setResults(ordenado)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-4 pt-8 max-w-md mx-auto">

        <h1 className="text-2xl font-bold text-white mb-6">
          Consultar Reputação
        </h1>

        {/* ---------- FORMULÁRIO ---------- */}
        <div className="bg-[#1A1A1A] p-5 rounded-xl border border-gray-800 mb-6">

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

        {/* ---------- RESULTADOS ---------- */}
        <div className="space-y-4">

          {!loading && results.length === 0 && !error && (
            <p className="text-gray-500 text-center text-sm">
              Nenhum resultado encontrado
            </p>
          )}

          {results.map((r) => {
            const badge = getBadge(r)

            return (
              <div
                key={r.id}
                onClick={() =>
                  router.push(`/consultar-reputacao/${r.id}`)
                }
                className="bg-[#1A1A1A] border border-gray-800 hover:border-[#D4AF37] hover:scale-[1.01] transition rounded-xl p-5 cursor-pointer"
              >

                <div className="flex justify-between items-start mb-3">

                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {r.display_name}
                    </h3>

                    {r.city && (
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                        <MapPin size={12} />
                        {r.city}
                      </p>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-1 text-white px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Star size={18} fill="currentColor" />
                  <span className="font-bold text-lg">
                    {mediaFormatada(r)}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  {r.total_avaliacoes} avaliações •{' '}
                  {r.confiabilidade_percentual}% confiável
                </div>

                {r.flags_negative?.length ? (
                  <div className="flex items-center gap-2 text-red-400 text-xs mt-3">
                    <AlertTriangle size={14} />
                    {r.flags_negative.length} alerta(s) ativo(s)
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <Navbar />
    </div>
  )
}
