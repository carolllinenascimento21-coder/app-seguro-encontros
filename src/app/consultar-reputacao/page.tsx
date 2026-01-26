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

interface Avaliacao {
  id: string
  nome: string | null
  cidade: string | null
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
  flags_positive: string[] | null
  flags_negative: string[] | null
}

export default function ConsultarReputacao() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [results, setResults] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false) // 🔒 paywall backend

  /* ────────────────────────────────────────────────
   * ⭐ Média segura
   * ──────────────────────────────────────────────── */
  const media = (a: Avaliacao) => {
    const valores = [
      a.comportamento,
      a.seguranca_emocional,
      a.respeito,
      a.carater,
      a.confianca,
    ].filter((v): v is number => typeof v === 'number')

    if (valores.length === 0) return '—'
    return (valores.reduce((acc, v) => acc + v, 0) / valores.length).toFixed(1)
  }

  /* ────────────────────────────────────────────────
   * 🔍 Busca (backend decide tudo)
   * ──────────────────────────────────────────────── */
  const buscar = async () => {
    if (!nome.trim() && !cidade.trim()) {
      alert('Digite um nome ou cidade para buscar.')
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (nome.trim()) params.set('nome', nome.trim())
      if (cidade.trim()) params.set('cidade', cidade.trim())

      const res = await fetch(`/api/busca?${params.toString()}`)
      const payload = await res.json()

      if (!res.ok && payload?.code === 'FREE_LIMIT_REACHED') {
        setBlocked(true)
        return
      }

      if (!res.ok) {
        alert('Erro ao buscar reputação.')
        return
      }

      setBlocked(false)
      setResults(payload.results ?? [])
    } catch {
      alert('Erro ao buscar reputação.')
    } finally {
      setLoading(false)
    }
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

        {/* 🔎 Filtro */}
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800 mb-6">
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome (opcional)"
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white mb-3"
          />

          <input
            value={cidade}
            onChange={e => setCidade(e.target.value)}
            placeholder="Cidade (opcional)"
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white mb-4"
          />

          <button
            onClick={buscar}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg flex justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </div>

        {/* 🔒 PAYWALL */}
        {blocked && (
          <div className="border border-[#D4AF37] rounded-xl p-5 mb-6 bg-black/60">
            <div className="flex gap-3 items-start">
              <Lock className="w-6 h-6 text-[#D4AF37]" />
              <div>
                <p className="text-sm text-[#EFD9A7]">
                  Você já utilizou sua consulta gratuita.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Para continuar e ver detalhes completos, ative um plano.
                </p>

                <button
                  onClick={() => router.push('/planos')}
                  className="mt-4 flex items-center gap-2 bg-[#D4AF37] text-black font-bold px-4 py-2 rounded-lg"
                >
                  <Crown className="w-4 h-4" />
                  Ver planos Premium
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📊 Resultados */}
        <div className="space-y-4">
          {results.map(r => (
            <div
              key={r.id}
              className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5 cursor-pointer"
              onClick={() =>
                router.push(`/consultar-reputacao/${r.id}`)
              }
            >
              <div className="flex justify-between mb-2">
                <div>
                  <h3 className="text-white font-bold">
                    {r.nome ?? 'Avaliação anônima'}
                  </h3>

                  {r.cidade && (
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {r.cidade}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[#D4AF37]">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-bold">{media(r)}</span>
                </div>
              </div>

              {blocked && (
                <div className="flex items-center gap-2 text-xs text-[#D4AF37] mt-2">
                  <Lock className="w-4 h-4" />
                  Detalhes completos protegidos
                </div>
              )}

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

          {!loading && results.length === 0 && !blocked && (
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
