'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

export default function AvaliarPage() {
  const searchParams = useSearchParams()
  const avaliadoId = searchParams.get('avaliadoId') // 🔴 OBRIGATÓRIO

  const [anonimo, setAnonimo] = useState(false)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [contato, setContato] = useState('')
  const [descricao, setDescricao] = useState('')

  const [comportamento, setComportamento] = useState(0)
  const [segurancaEmocional, setSegurancaEmocional] = useState(0)
  const [respeito, setRespeito] = useState(0)
  const [carater, setCarater] = useState(0)
  const [confianca, setConfianca] = useState(0)

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function toggleFlag(flag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(flag) ? list.filter(f => f !== flag) : [...list, flag])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!avaliadoId) {
      alert('ID do perfil avaliado não encontrado.')
      setLoading(false)
      return
    }

    if (!anonimo && !nome) {
      alert('Nome é obrigatório quando não for anônimo')
      setLoading(false)
      return
    }

    const payload = {
      avaliadoId,
      nome: anonimo ? 'Anônimo' : nome,
      descricao: descricao || null,
      cidade: cidade || null,
      contato: contato || null,
      anonimo,

      ratings: {
        comportamento,
        seguranca_emocional: segurancaEmocional,
        respeito,
        carater,
        confianca,
      },

      greenFlags,
      redFlags,
    }

    const res = await fetch('/api/avaliacoes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      console.error(data)
      alert(data?.message || 'Erro ao publicar avaliação')
      return
    }

    alert('Avaliação publicada com sucesso')
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Fazer avaliação</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {!anonimo && (
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-zinc-900 p-3 rounded"
          />
        )}

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

        <textarea
          placeholder="Relato"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded min-h-[120px]"
        />

        {/* FLAGS */}
        <div>
          <p className="text-green-400 mb-2">Green Flags</p>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map(f => (
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
            {RED_FLAGS.map(f => (
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

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => {
              setAnonimo(e.target.checked)
              if (e.target.checked) setNome('')
            }}
          />
          Avaliar de forma anônima
        </label>

        <button
          disabled={loading}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </form>
    </main>
  )
}
