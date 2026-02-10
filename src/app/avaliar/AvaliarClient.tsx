'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

function AvaliarForm() {
  const [anonimo, setAnonimo] = useState(false)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [contato, setContato] = useState('')
  const [descricao, setDescricao] = useState('')

  const [ratings, setRatings] = useState<Record<CriterioKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const ratingsValid = Object.values(ratings).every((value) => value >= 1)
  const nomeValid = nome.trim().length > 0
  const cidadeValid = cidade.trim().length > 0

  function toggleFlag(flag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(flag) ? list.filter((f) => f !== flag) : [...list, flag])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nomeValid || !cidadeValid) {
      alert('Nome e cidade são obrigatórios')
      return
    }

    if (!ratingsValid) {
      alert('Avalie todos os critérios com notas de 1 a 5')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cidade: cidade.trim(),
          contato: contato.trim() || null,
          descricao: descricao.trim() || null,
          anonimo,
          ratings,
          greenFlags,
          redFlags,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data?.message || 'Erro ao publicar avaliação')
        return
      }

      alert('Avaliação publicada com sucesso!')
      window.location.href = '/consultar-reputacao'
    } catch {
      alert('Erro de rede ao publicar avaliação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Fazer avaliação</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <input
          placeholder="Cidade"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <input
          placeholder="Contato (opcional)"
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <div className="space-y-4">
          <p className="text-sm text-gray-300">Avalie por critério</p>
          {CRITERIOS.map((criterio) => (
            <div key={criterio.key}>
              <p className="text-sm text-gray-200 mb-2">{criterio.label}</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((valor) => {
                  const isActive = ratings[criterio.key] >= valor
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() =>
                        setRatings((prev) => ({
                          ...prev,
                          [criterio.key]: valor,
                        }))
                      }
                      className="transition-transform hover:scale-110"
                      aria-label={`${criterio.label} ${valor} estrelas`}
                    >
                      <Star
                        className={`w-7 h-7 ${
                          isActive
                            ? 'text-[#D4AF37] fill-[#D4AF37]'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-green-400 mb-2">Green Flags</p>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map((f) => (
              <button
                type="button"
                key={f.slug}
                onClick={() => toggleFlag(f.slug, greenFlags, setGreenFlags)}
                className={`px-3 py-1 rounded text-sm ${
                  greenFlags.includes(f.slug) ? 'bg-green-500 text-black' : 'bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-red-400 mb-2">Red Flags</p>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((f) => (
              <button
                type="button"
                key={f.slug}
                onClick={() => toggleFlag(f.slug, redFlags, setRedFlags)}
                className={`px-3 py-1 rounded text-sm ${
                  redFlags.includes(f.slug) ? 'bg-red-500 text-black' : 'bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Relato"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded min-h-[120px]"
        />

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => {
              setAnonimo(e.target.checked)
            }}
          />
          Avaliar de forma anônima
        </label>

        <button
          disabled={loading || !ratingsValid || !nomeValid || !cidadeValid}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </form>
    </main>
  )
}

export default function AvaliarClient() {
  return <AvaliarForm />
}
