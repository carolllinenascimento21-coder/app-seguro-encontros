'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

export default function AvaliarClient() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [relato, setRelato] = useState('')
  const [anonima, setAnonima] = useState(false)
  const [loading, setLoading] = useState(false)

  const [notas, setNotas] = useState<Record<CriterioKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const setNota = (criterio: CriterioKey, value: number) => {
    setNotas(prev => ({ ...prev, [criterio]: value }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        credentials: 'include', // 🔒 ESSENCIAL PARA ENVIAR COOKIE DA SESSÃO
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          cidade,
          telefone,
          relato,
          is_anonymous: anonima,
          ...notas,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(errorText)
        alert('Erro ao publicar avaliação.')
        return
      }

      router.push('/minhas-avaliacoes')
    } catch (error) {
      console.error(error)
      alert('Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">Nova Avaliação</h1>

      {CRITERIOS.map(c => (
        <div key={c.key} className="mb-4">
          <p className="mb-2">{c.label}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                onClick={() => setNota(c.key, n)}
                className={`w-6 h-6 cursor-pointer ${
                  notas[c.key] >= n
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      ))}

      <input
        placeholder="Nome do homem"
        value={nome}
        onChange={e => setNome(e.target.value)}
        className="w-full bg-[#1A1A1A] p-3 rounded-lg mb-3"
      />

      <input
        placeholder="Cidade"
        value={cidade}
        onChange={e => setCidade(e.target.value)}
        className="w-full bg-[#1A1A1A] p-3 rounded-lg mb-3"
      />

      <input
        placeholder="Telefone"
        value={telefone}
        onChange={e => setTelefone(e.target.value)}
        className="w-full bg-[#1A1A1A] p-3 rounded-lg mb-3"
      />

      <textarea
        placeholder="Relato"
        value={relato}
        onChange={e => setRelato(e.target.value)}
        className="w-full bg-[#1A1A1A] p-3 rounded-lg mb-3"
      />

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={anonima}
          onChange={e => setAnonima(e.target.checked)}
        />
        Avaliar de forma anônima
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl"
      >
        {loading ? 'Publicando...' : 'Publicar avaliação'}
      </button>
    </div>
  )
}
